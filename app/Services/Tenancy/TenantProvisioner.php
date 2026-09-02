<?php

namespace App\Services\Tenancy;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Subscriptions\BillingGrace;
use App\Support\Subscriptions\SubscriptionCiclo;
use App\Support\Tenancy\TenantSubdomainUrl;
use App\Tenancy\TenantSchemaMigrator;
use Database\Seeders\TenantRolesSeeder;
use Database\Seeders\VehiculoMarcaModeloSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Console\Output\NullOutput;

/**
 * Crea un tenant completo: registro en `public.tenants`, schema PostgreSQL
 * dedicado, migraciones tenant aplicadas y usuario admin del taller.
 *
 * Llamado desde `POST /api/internal/saas/provision` (Orvae PE) y desde CLI.
 */
class TenantProvisioner
{
    public function __construct(
        private readonly TenantSchemaMigrator $migrator,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws InvalidArgumentException Slug inválido o plan inexistente.
     * @throws RuntimeException Driver de BD no soportado.
     */
    public function provision(array $payload): Tenant
    {
        $this->guardDriver();

        $plan = $this->resolvePlan($payload['plan_slug']);
        $slug = $this->normalizeSlug($payload['tenant_slug']);
        $schemaName = $this->buildSchemaName();

        $isFreePlan = $plan->codigo === Plan::CODIGO_FREE;

        $tenant = DB::transaction(function () use ($plan, $slug, $schemaName, $payload, $isFreePlan): Tenant {
            $tenant = Tenant::create([
                'slug' => $slug,
                'schema_name' => $schemaName,
                'razon_social' => $payload['razon_social'],
                'nombre_comercial' => $payload['nombre_comercial'] ?? null,
                'ruc' => $payload['ruc'] ?? null,
                'email_admin' => $payload['admin_email'],
                'telefono' => $payload['telefono'] ?? null,
                'estado' => $isFreePlan ? 'active' : 'trial',
                'trial_ends_at' => $isFreePlan
                    ? null
                    : now()->addDays((int) $plan->trial_days),
                'onboarding_paso' => 0,
                'timezone' => $payload['timezone'] ?? 'America/Lima',
                'locale' => $payload['locale'] ?? 'es_PE',
                'canal_adquisicion' => $payload['canal_adquisicion'] ?? 'orvae',
            ]);

            $subscription = $this->createSubscription($tenant, $plan, $payload);

            if (! empty($payload['payment'])) {
                $this->recordPayment($subscription, $tenant, $plan, $payload['payment']);
            } elseif ($isFreePlan) {
                $this->recordPayment($subscription, $tenant, $plan, [
                    'monto' => 0,
                    'moneda' => 'PEN',
                    'pasarela' => $payload['canal_adquisicion'] ?? 'orvae',
                    'estado' => 'procesado',
                ]);
            }

            return $tenant;
        });

        $exitCode = $this->migrator->migrate($schemaName, new NullOutput);

        if ($exitCode !== TenantSchemaMigrator::EXIT_SUCCESS) {
            throw new RuntimeException("No se pudieron aplicar las migraciones tenant en el schema \"{$schemaName}\".");
        }

        $this->seedTenantSchema($schemaName, $tenant, $payload);

        return $tenant->refresh();
    }

    public function buildLoginUrl(Tenant $tenant): string
    {
        return TenantSubdomainUrl::login($tenant);
    }

    /**
     * Emite (o renueva) el token one-shot y devuelve la URL absoluta de bienvenida.
     */
    public function issueBootstrapLoginUrl(Tenant $tenant, User $user): string
    {
        $plain = Str::random(64);
        $ttlHours = max(1, (int) config('orvae.tenant.bootstrap_ttl_hours', 48));

        $user->forceFill([
            'bootstrap_login_token' => hash('sha256', $plain),
            'bootstrap_login_expires_at' => now()->addHours($ttlHours),
        ])->save();

        return TenantSubdomainUrl::bootstrapLogin($tenant, $plain);
    }

    public function findAdminUser(Tenant $tenant): ?User
    {
        return User::query()
            ->where('tenant_id', $tenant->id)
            ->whereRaw('LOWER(email) = ?', [strtolower(trim((string) $tenant->email_admin))])
            ->first();
    }

    private function guardDriver(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('Solo PostgreSQL soporta multi-tenant por schema.');
        }
    }

    private function resolvePlan(string $codigo): Plan
    {
        $plan = Plan::where('codigo', $codigo)->where('activo', true)->first();

        if ($plan === null) {
            throw new InvalidArgumentException("Plan no encontrado o inactivo: {$codigo}");
        }

        return $plan;
    }

    private function normalizeSlug(string $slug): string
    {
        $slug = strtolower(trim($slug));

        if (! preg_match('/^[a-z0-9\-]{3,60}$/', $slug)) {
            throw new InvalidArgumentException("Slug inválido: {$slug}");
        }

        if (Tenant::where('slug', $slug)->exists()) {
            throw new InvalidArgumentException("Slug ya está en uso: {$slug}");
        }

        return $slug;
    }

    private function buildSchemaName(): string
    {
        $prefix = (string) config('tenant.schema_prefix', 'tlr_');

        do {
            $name = $prefix.strtolower(Str::random(6));
        } while (Tenant::where('schema_name', $name)->exists());

        return $name;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function createSubscription(Tenant $tenant, Plan $plan, array $payload): Subscription
    {
        $ciclo = SubscriptionCiclo::normalize($payload['ciclo'] ?? null);
        $precio = SubscriptionCiclo::suggestedPriceFromPlan(
            (float) $plan->precio_mensual,
            $plan->precio_anual !== null ? (float) $plan->precio_anual : null,
            $ciclo,
        );

        $isFreePlan = $plan->codigo === Plan::CODIGO_FREE;

        $periodEnd = now()->addMonthsNoOverflow(SubscriptionCiclo::months($ciclo));

        return Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'estado' => $isFreePlan ? 'active' : 'trial',
            'ciclo' => $ciclo,
            'trial_ends_at' => $tenant->trial_ends_at,
            'current_period_start' => now(),
            'current_period_end' => $periodEnd,
            'proximo_cobro_at' => $periodEnd,
            'grace_ends_at' => $isFreePlan ? null : BillingGrace::endsAtFrom($periodEnd),
            'precio_pactado' => $precio,
            'descuento_pct' => $payload['descuento_pct'] ?? 0,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payment
     */
    private function recordPayment(Subscription $subscription, Tenant $tenant, Plan $plan, array $payment): void
    {
        SubscriptionPayment::create([
            'subscription_id' => $subscription->id,
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'monto' => $payment['monto'],
            'moneda' => $payment['moneda'] ?? 'PEN',
            'igv_monto' => $payment['igv_monto'] ?? 0,
            'descuento_monto' => $payment['descuento_monto'] ?? 0,
            'total' => $payment['total'] ?? $payment['monto'],
            'estado' => $payment['estado'] ?? 'procesado',
            'pasarela' => $payment['pasarela'] ?? 'orvae',
            'pasarela_transaction_id' => $payment['transaction_id'] ?? null,
            'pasarela_response' => $payment['raw_response'] ?? null,
            'periodo_inicio' => $subscription->current_period_start,
            'periodo_fin' => $subscription->current_period_end,
            'pagado_at' => isset($payment['pagado_at']) ? Carbon::parse($payment['pagado_at']) : now(),
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function seedTenantSchema(string $schema, Tenant $tenant, array $payload): void
    {
        DB::statement('SET search_path TO "'.$schema.'", public');

        try {
            DB::table('cfg_taller_settings')->insert([
                'id' => (string) Str::uuid(),
                'razon_social' => $tenant->razon_social,
                'nombre_comercial' => $tenant->nombre_comercial,
                'ruc' => $tenant->ruc,
                'email_institucional' => $tenant->email_admin,
                'telefono_principal' => $tenant->telefono,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } finally {
            DB::statement('SET search_path TO public');
        }

        (new VehiculoMarcaModeloSeeder)->seedForSchema($schema);

        (new TenantRolesSeeder)->seedForTenant((string) $tenant->id);

        $nombre = trim(implode(' ', array_filter([
            $payload['admin_nombres'] ?? 'Administrador',
            $payload['admin_apellidos'] ?? 'Taller',
        ])));

        $user = User::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'email' => $tenant->email_admin,
            ],
            [
                'name' => $nombre !== '' ? $nombre : 'Administrador Taller',
                'password' => Hash::make((string) $payload['admin_password']),
                'phone' => $payload['telefono'] ?? null,
                'is_active' => true,
                'must_change_password' => true,
                'email_verified_at' => null,
            ],
        );

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId((string) $tenant->id);
        try {
            if ($user->roles()->where('name', 'admin_taller')->doesntExist()) {
                $user->assignRole('admin_taller');
            }
        } finally {
            setPermissionsTeamId($previousTeam);
        }
    }
}
