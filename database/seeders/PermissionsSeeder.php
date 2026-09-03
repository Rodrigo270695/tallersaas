<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Cataloga **todos** los permisos de la aplicación.
 *
 * Convención de nombres: `<modulo>.<accion>` en minúsculas y separados por punto.
 *
 * Reglas:
 *   - **Idempotente**: se puede correr múltiples veces sin duplicar filas.
 *   - **No asigna** permisos a roles: eso lo hace {@see TenantRolesSeeder}
 *     (roles de taller) y {@see SuperadminSeeder} (rol superadmin).
 *   - Si un permiso desaparece del catálogo, queda en BD (no se borra
 *     automáticamente para preservar histórico).
 */
class PermissionsSeeder extends Seeder
{
    /**
     * Catálogo maestro de permisos por módulo. Agregar aquí cualquier
     * permiso nuevo y luego correr `php artisan db:seed --class=PermissionsSeeder`.
     */
    public const CATALOG = [
        // ───── Dashboard ─────
        'dashboard' => ['view'],

        // ───── Clientes y vehículos ─────
        'clientes' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],
        'vehiculos' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],

        // ───── Órdenes de trabajo ─────
        'ordenes-trabajo' => ['view', 'create', 'update', 'delete', 'cancel', 'cerrar'],
        'citas' => ['view', 'create', 'update', 'delete', 'convert'],
        'cotizaciones' => ['view', 'create', 'update', 'delete', 'aprobar'],
        'checklist-inspeccion' => ['view', 'create', 'update'],
        'servicios' => ['view', 'create', 'update', 'delete'],
        'categorias-servicios' => ['view', 'create', 'update', 'delete'],

        // ───── Inventario / repuestos ─────
        'productos' => ['view', 'create', 'update', 'delete'],
        'categorias-inventario' => ['view', 'create', 'update', 'delete'],
        'stock' => ['view', 'adjust'],
        'movimientos-stock' => ['view', 'create', 'export'],
        'alertas-stock' => ['view'],
        'proveedores' => ['view', 'create', 'update', 'delete'],
        'compras' => ['view', 'create', 'update', 'delete'],

        // ───── Caja ─────
        'caja-sesiones' => ['view', 'open', 'close', 'egreso'],
        'ventas' => ['view', 'create', 'update', 'delete'],
        'pagos' => ['view', 'create', 'refund'],
        'descuentos' => ['view', 'create', 'update', 'delete'],

        // ───── Facturación ─────
        'documentos' => ['view', 'create', 'send', 'cancel'],
        'series' => ['view', 'create', 'update', 'delete'],
        'notas-baja' => ['view', 'create'],

        // ───── Reportes ─────
        'reporte-financiero' => ['view', 'export'],
        'reporte-ordenes' => ['view'],

        // ───── Comunicaciones / WhatsApp ─────
        'comunicaciones-cola' => ['view', 'manage'],
        'comunicaciones-historico' => ['view'],

        // ───── Configuración ─────
        'config-general' => ['view', 'update'],
        'sedes' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],
        'roles' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],
        'usuarios' => ['view', 'create', 'update', 'delete', 'reset-password', 'export', 'bulk-delete'],

        // ───── Auditoría ─────
        'auditoria-logs' => ['view', 'export'],
        'auditoria-login-attempts' => ['view'],
        'audit-trail' => ['view'],

        // ───── Plataforma (solo superadmin SaaS) ─────
        'plataforma-tenants' => ['view', 'create', 'update', 'suspend', 'resume', 'delete', 'export', 'bulk-delete', 'impersonate'],
        'plataforma-planes' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],
        'plataforma-unidades-medida' => ['view', 'create', 'update', 'delete'],
        'plataforma-suscripciones' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete', 'extend-trial', 'change-plan', 'cancel'],
        'plataforma-cobros' => ['view', 'export', 'renew', 'refund', 'resend-invoice', 'add-note'],
        'plataforma-operaciones' => ['view', 'manage'],
        'platform-settings' => ['view', 'update'],
    ];

    public function run(): void
    {
        $guard = config('auth.defaults.guard', 'web');

        $existing = Permission::query()
            ->where('guard_name', $guard)
            ->pluck('id', 'name')
            ->all();

        $now = now();
        $toInsert = [];

        foreach (self::expand() as $name) {
            if (isset($existing[$name])) {
                continue;
            }

            $toInsert[] = [
                'name' => $name,
                'guard_name' => $guard,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (! empty($toInsert)) {
            DB::table(config('permission.table_names.permissions'))->insert($toInsert);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Expande el catálogo a la lista plana de strings (`modulo.accion`).
     *
     * @return array<int, string>
     */
    public static function expand(): array
    {
        $permissions = [];

        foreach (self::CATALOG as $module => $actions) {
            foreach ($actions as $action) {
                $permissions[] = "{$module}.{$action}";
            }
        }

        sort($permissions);

        return $permissions;
    }
}
