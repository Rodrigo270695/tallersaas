<?php

declare(strict_types=1);

namespace App\Services\Onboarding;

use App\Models\Cita;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Sede;
use App\Models\TallerSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Vehiculo;
use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Checklist de arranque del taller. Guía, no bloquea.
 *
 * Pasos: sede → datos fiscales → cliente/vehículo → cita u OT → primer cobro.
 */
class TallerOnboardingService
{
    public const STEP_SEDE = 0;

    public const STEP_TALLER = 1;

    public const STEP_CLIENTE = 2;

    public const STEP_OPERACION = 3;

    public const STEP_VENTA = 4;

    public const TOTAL_STEPS = 5;

    public function isActiveForTenant(Tenant $tenant): bool
    {
        $slugs = config('onboarding.enabled_slugs', []);

        if ($slugs !== []) {
            return in_array(strtolower((string) $tenant->slug), $slugs, true);
        }

        return (bool) config('onboarding.enabled', true);
    }

    public function shouldShow(Tenant $tenant): bool
    {
        return $this->isActiveForTenant($tenant) && ! $tenant->onboarding_completado;
    }

    public function shouldShowCard(Tenant $tenant, ?Request $request = null): bool
    {
        if ($this->isPreviewMode($request)) {
            return true;
        }

        return $this->shouldShow($tenant);
    }

    public function isPreviewMode(?Request $request = null): bool
    {
        if ((bool) config('onboarding.preview', false)) {
            return true;
        }

        $request ??= request();

        return $request !== null && $request->boolean('onboarding_preview');
    }

    public function hasAnyActiveSede(string $tenantId): bool
    {
        return Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->exists();
    }

    public function sync(Tenant $tenant): Tenant
    {
        if (! $this->isActiveForTenant($tenant)) {
            return $tenant;
        }

        $flags = $this->detectStepCompletion($tenant);
        $allComplete = ! in_array(false, $flags, true);

        $paso = self::STEP_VENTA;
        foreach ($flags as $index => $done) {
            if (! $done) {
                $paso = $index;
                break;
            }
        }

        $tenant->forceFill([
            'onboarding_paso' => $allComplete ? self::STEP_VENTA : $paso,
            'onboarding_completado' => $allComplete,
        ]);

        if ($tenant->isDirty(['onboarding_paso', 'onboarding_completado'])) {
            $tenant->save();
        }

        return $tenant->refresh();
    }

    /**
     * @return array{
     *     show: bool,
     *     completed: bool,
     *     paso: int,
     *     total_steps: int,
     *     completed_steps: int,
     *     preview: bool,
     *     steps: list<array{
     *         id: string,
     *         title: string,
     *         description: string,
     *         href: ?string,
     *         completed: bool,
     *         current: bool,
     *         locked: bool,
     *         required: bool
     *     }>
     * }
     */
    public function snapshot(Tenant $tenant, User $user, ?Request $request = null): array
    {
        $preview = $this->isPreviewMode($request);

        if (! $preview) {
            $tenant = $this->sync($tenant);
        }

        $flags = $this->detectStepCompletion($tenant);
        $definitions = $this->stepDefinitions($user);
        $firstIncomplete = self::STEP_VENTA;

        foreach ($flags as $index => $done) {
            if (! $done) {
                $firstIncomplete = $index;
                break;
            }
        }

        $steps = [];
        foreach ($definitions as $index => $definition) {
            $completed = $flags[$index] ?? false;
            $locked = $index > 0 && ! ($flags[0] ?? false);
            $steps[] = [
                'id' => $definition['id'],
                'title' => $definition['title'],
                'description' => $definition['description'],
                'href' => $locked || $definition['href'] === null ? null : $definition['href'],
                'completed' => $completed,
                'current' => ! $tenant->onboarding_completado && $index === $firstIncomplete,
                'locked' => $locked,
                'required' => $definition['required'],
            ];
        }

        return [
            'show' => $this->shouldShowCard($tenant, $request),
            'preview' => $preview,
            'completed' => (bool) $tenant->onboarding_completado,
            'paso' => (int) $tenant->onboarding_paso,
            'total_steps' => self::TOTAL_STEPS,
            'completed_steps' => count(array_filter($flags)),
            'steps' => $steps,
        ];
    }

    /**
     * @return list<bool>
     */
    public function detectStepCompletion(Tenant $tenant): array
    {
        $tenantId = (string) $tenant->id;

        return [
            $this->hasAnyActiveSede($tenantId),
            $this->hasTallerProfile(),
            $this->hasClienteYVehiculo(),
            $this->hasCitaOOrden(),
            $this->hasVenta(),
        ];
    }

    /**
     * @return list<array{id: string, title: string, description: string, href: ?string, required: bool}>
     */
    private function stepDefinitions(User $user): array
    {
        return [
            [
                'id' => 'sede',
                'title' => 'Crear tu primera sede',
                'description' => 'Local donde atiendes. Recomendado para caja, citas e inventario.',
                'href' => $this->userCan($user, 'sedes.view') ? '/configuracion/sedes' : null,
                'required' => true,
            ],
            [
                'id' => 'taller',
                'title' => 'Datos del taller',
                'description' => 'RUC y razón social (o nombre comercial) para comprobantes.',
                'href' => $this->userCan($user, 'config-general.view') ? '/configuracion/general' : null,
                'required' => false,
            ],
            [
                'id' => 'cliente',
                'title' => 'Cliente y vehículo',
                'description' => 'Registra el primer cliente y su placa para abrir citas u OT.',
                'href' => $this->userCan($user, 'clientes.view') ? '/taller/clientes' : null,
                'required' => false,
            ],
            [
                'id' => 'operacion',
                'title' => 'Cita u orden de trabajo',
                'description' => 'Agenda una cita o recibe el primer vehículo en taller.',
                'href' => $this->userCan($user, 'citas.view')
                    ? '/taller/citas'
                    : ($this->userCan($user, 'ordenes-trabajo.view') ? '/taller/ordenes-trabajo' : null),
                'required' => false,
            ],
            [
                'id' => 'venta',
                'title' => 'Primer cobro',
                'description' => 'Abre caja y registra la primera venta desde una OT.',
                'href' => $this->userCan($user, 'caja-sesiones.view') ? '/caja/sesiones' : null,
                'required' => false,
            ],
        ];
    }

    private function hasTallerProfile(): bool
    {
        if (! Schema::hasTable('cfg_taller_settings')) {
            return false;
        }

        $setting = TallerSetting::query()->first();
        if ($setting === null) {
            return false;
        }

        $ruc = trim((string) ($setting->ruc ?? ''));
        $razon = trim((string) ($setting->razon_social ?? ''));
        $comercial = trim((string) ($setting->nombre_comercial ?? ''));

        return $ruc !== '' && ($razon !== '' || $comercial !== '');
    }

    private function hasClienteYVehiculo(): bool
    {
        if (! Schema::hasTable('clientes') || ! Schema::hasTable('vehiculos')) {
            return false;
        }

        return Cliente::query()->exists() && Vehiculo::query()->exists();
    }

    private function hasCitaOOrden(): bool
    {
        $cita = Schema::hasTable('citas') && Cita::query()->exists();
        $ot = Schema::hasTable('ordenes_trabajo') && OrdenTrabajo::query()->exists();

        return $cita || $ot;
    }

    private function hasVenta(): bool
    {
        if (! Schema::hasTable('ventas')) {
            return false;
        }

        return Venta::query()
            ->whereIn('estado', [Venta::ESTADO_PAGADO, Venta::ESTADO_PARCIAL])
            ->exists();
    }

    private function userCan(User $user, string $ability): bool
    {
        try {
            return $user->can($ability);
        } catch (Throwable) {
            return false;
        }
    }
}
