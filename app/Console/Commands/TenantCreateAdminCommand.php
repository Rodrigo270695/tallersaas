<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\TenantRolesSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Crea el primer usuario administrador de un taller.
 *
 * Arquitectura "single-login + datos aislados": el usuario vive en
 * `public.users` con `tenant_id` apuntando al taller. Se le asigna el
 * rol Spatie `admin_taller`, sembrado por {@see TenantRolesSeeder}.
 */
class TenantCreateAdminCommand extends Command
{
    protected $signature = 'tallersaas:tenant-create-admin
                            {slug : Slug del tenant (subdominio)}
                            {--email= : Email del nuevo admin}
                            {--password= : Contraseña explícita. Si se omite, se genera una aleatoria y se muestra en pantalla}
                            {--name= : Nombre completo del admin (ej. "Juan Pérez")}
                            {--phone= : Teléfono de contacto (opcional)}
                            {--force : No preguntar si el email ya existe (sobreescribe contraseña)}';

    protected $description = 'Crea o actualiza el primer admin de un taller.';

    public function handle(): int
    {
        $slug = (string) $this->argument('slug');

        $tenant = Tenant::query()->where('slug', $slug)->first();
        if ($tenant === null) {
            $this->error("Tenant con slug \"$slug\" no encontrado en public.tenants.");

            return self::FAILURE;
        }

        $email = $this->option('email') ?: $this->ask('Email del admin');
        $name = $this->option('name') ?: $this->ask('Nombre completo (ej. "Juan Pérez")');
        $phone = $this->option('phone');

        $explicitPassword = $this->option('password');
        $isGeneratedPassword = $explicitPassword === null;
        $password = $isGeneratedPassword
            ? Str::password(length: 16, symbols: false)
            : $explicitPassword;

        try {
            $payload = validator([
                'email' => $email,
                'password' => $password,
                'name' => $name,
                'phone' => $phone,
            ], [
                'email' => ['required', 'email', 'max:150'],
                'password' => ['required', 'string', 'min:8', 'max:200'],
                'name' => ['required', 'string', 'max:120'],
                'phone' => ['nullable', 'string', 'max:30'],
            ])->validate();
        } catch (ValidationException $e) {
            foreach ($e->errors() as $field => $messages) {
                foreach ($messages as $msg) {
                    $this->error("[$field] $msg");
                }
            }

            return self::FAILURE;
        }

        $existing = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('email', $payload['email'])
            ->first();

        if ($existing !== null && ! $this->option('force')) {
            if (! $this->confirm("El email {$payload['email']} ya existe en este taller. ¿Sobreescribir contraseña y forzar rol admin_taller?", false)) {
                $this->warn('Operación cancelada por el usuario.');

                return self::SUCCESS;
            }
        }

        $values = [
            'tenant_id' => $tenant->id,
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => Hash::make($payload['password']),
            'phone' => $payload['phone'] ?? null,
            'is_active' => true,
            'must_change_password' => true,
            'email_verified_at' => now(),
        ];

        $result = DB::transaction(function () use ($existing, $values, $tenant): array {
            (new TenantRolesSeeder)->seedForTenant((string) $tenant->id);

            $previousTeam = getPermissionsTeamId();
            setPermissionsTeamId((string) $tenant->id);

            try {
                if ($existing !== null) {
                    $existing->forceFill($values)->save();
                    $existing->syncRoles(['admin_taller']);

                    return ['status' => 'updated', 'user' => $existing->fresh()];
                }

                $user = new User;
                $user->forceFill($values)->save();
                $user->syncRoles(['admin_taller']);

                return ['status' => 'created', 'user' => $user->fresh()];
            } finally {
                setPermissionsTeamId($previousTeam);
            }
        });

        $accion = $result['status'] === 'created' ? 'creado' : 'actualizado';
        $this->info("Admin $accion correctamente en el taller \"$slug\".");
        $this->line("  · Email: {$payload['email']}");
        $this->line("  · Nombre: {$payload['name']}");
        $this->line('  · Rol: admin_taller');
        $this->line('  · URL de login: http://'.$slug.'.'.config('tenant.root_domain').'/login');

        if ($isGeneratedPassword) {
            $this->warn("  · Password generado: {$payload['password']} (guárdalo, no se volverá a mostrar)");
        }

        return self::SUCCESS;
    }
}
