<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Crea (o actualiza con cuidado) los **roles base de cada taller/tenant**.
 *
 *   - admin_taller   → dueño del taller (todo acceso menos plataforma SaaS).
 *   - mecanico       → atiende órdenes de trabajo, checklist e inventario (lectura).
 *   - recepcionista  → agenda, caja, clientes/vehículos y facturación.
 *   - almacenero     → inventario, compras y proveedores.
 *
 * Características:
 *   - **Por tenant**: cada taller tiene sus propias filas de roles
 *     (`roles.tenant_id`). Cambiar permisos en A no afecta a B.
 *   - **Por defecto aditivo**: solo **añade** permisos del catálogo base que
 *     falten. **No quita** lo que el tenant configuró en Roles y permisos.
 *   - **`$forceSync = true`**: `syncPermissions` (pisa customizaciones del
 *     rol base). Úsese solo conscientemente.
 *   - Depende de {@see PermissionsSeeder} (los permisos deben existir antes).
 */
class TenantRolesSeeder extends Seeder
{
    /**
     * @var array<string, array{description: string, permissions: array<int, string>}>
     */
    public const ROLES = [
        'admin_taller' => [
            'description' => 'Dueño o administrador del taller. Acceso operativo total dentro del tenant: configuración, usuarios, finanzas y módulos operativos.',
            'permissions' => [
                'dashboard.view',

                'clientes.view', 'clientes.create', 'clientes.update', 'clientes.delete', 'clientes.export', 'clientes.bulk-delete',
                'vehiculos.view', 'vehiculos.create', 'vehiculos.update', 'vehiculos.delete', 'vehiculos.export', 'vehiculos.bulk-delete',

                'ordenes-trabajo.view', 'ordenes-trabajo.create', 'ordenes-trabajo.update', 'ordenes-trabajo.delete', 'ordenes-trabajo.cancel', 'ordenes-trabajo.cerrar',
                'citas.view', 'citas.create', 'citas.update', 'citas.delete', 'citas.convert',
                'cotizaciones.view', 'cotizaciones.create', 'cotizaciones.update', 'cotizaciones.delete', 'cotizaciones.aprobar',
                'checklist-inspeccion.view', 'checklist-inspeccion.create', 'checklist-inspeccion.update',
                'servicios.view', 'servicios.create', 'servicios.update', 'servicios.delete',
                'categorias-servicios.view', 'categorias-servicios.create', 'categorias-servicios.update', 'categorias-servicios.delete',

                'productos.view', 'productos.create', 'productos.update', 'productos.delete',
                'categorias-inventario.view', 'categorias-inventario.create', 'categorias-inventario.update', 'categorias-inventario.delete',
                'stock.view', 'stock.adjust',
                'movimientos-stock.view', 'movimientos-stock.create', 'movimientos-stock.export',
                'alertas-stock.view',
                'proveedores.view', 'proveedores.create', 'proveedores.update', 'proveedores.delete',
                'compras.view', 'compras.create', 'compras.update', 'compras.delete',

                'caja-sesiones.view', 'caja-sesiones.open', 'caja-sesiones.close', 'caja-sesiones.egreso',
                'ventas.view', 'ventas.create', 'ventas.update', 'ventas.delete',
                'pagos.view', 'pagos.create', 'pagos.refund',
                'descuentos.view', 'descuentos.create', 'descuentos.update', 'descuentos.delete',

                'documentos.view', 'documentos.create', 'documentos.send', 'documentos.cancel',
                'series.view', 'series.create', 'series.update', 'series.delete',
                'notas-baja.view', 'notas-baja.create',

                'reporte-financiero.view', 'reporte-financiero.export',
                'reporte-ordenes.view',

                'comunicaciones-cola.view', 'comunicaciones-cola.manage',
                'comunicaciones-historico.view',

                'config-general.view', 'config-general.update',
                'sedes.view', 'sedes.create', 'sedes.update', 'sedes.delete', 'sedes.export', 'sedes.bulk-delete',
                'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.export', 'roles.bulk-delete',
                'usuarios.view', 'usuarios.create', 'usuarios.update', 'usuarios.delete', 'usuarios.reset-password', 'usuarios.export', 'usuarios.bulk-delete',

                'auditoria-logs.view', 'auditoria-logs.export',
                'auditoria-login-attempts.view',
            ],
        ],

        'mecanico' => [
            'description' => 'Mecánico. Atiende órdenes de trabajo, registra checklist de inspección y consulta inventario disponible.',
            'permissions' => [
                'dashboard.view',

                'clientes.view',
                'vehiculos.view', 'vehiculos.update',

                'ordenes-trabajo.view', 'ordenes-trabajo.update', 'ordenes-trabajo.cerrar',
                'citas.view',
                'cotizaciones.view',
                'checklist-inspeccion.view', 'checklist-inspeccion.create', 'checklist-inspeccion.update',
                'servicios.view',
                'categorias-servicios.view',

                'productos.view',
                'categorias-inventario.view',
                'stock.view',
                'alertas-stock.view',

                'reporte-ordenes.view',
            ],
        ],

        'recepcionista' => [
            'description' => 'Recepción y front-desk. Registra clientes/vehículos, abre órdenes de trabajo, cobra y emite comprobantes.',
            'permissions' => [
                'dashboard.view',

                'clientes.view', 'clientes.create', 'clientes.update',
                'vehiculos.view', 'vehiculos.create', 'vehiculos.update',

                'ordenes-trabajo.view', 'ordenes-trabajo.create', 'ordenes-trabajo.update', 'ordenes-trabajo.cancel',
                'citas.view', 'citas.create', 'citas.update', 'citas.convert',
                'cotizaciones.view', 'cotizaciones.create', 'cotizaciones.aprobar',
                'servicios.view', 'servicios.create',
                'categorias-servicios.view',

                'caja-sesiones.view', 'caja-sesiones.open', 'caja-sesiones.close', 'caja-sesiones.egreso',
                'ventas.view', 'ventas.create',
                'pagos.view', 'pagos.create',
                'descuentos.view',

                'documentos.view', 'documentos.create', 'documentos.send',
                'series.view',

                'comunicaciones-cola.view', 'comunicaciones-cola.manage',
                'comunicaciones-historico.view',
            ],
        ],

        'almacenero' => [
            'description' => 'Encargado de almacén. Gestiona inventario, compras y proveedores.',
            'permissions' => [
                'dashboard.view',

                'productos.view', 'productos.create', 'productos.update', 'productos.delete',
                'categorias-inventario.view', 'categorias-inventario.create', 'categorias-inventario.update', 'categorias-inventario.delete',
                'stock.view', 'stock.adjust',
                'movimientos-stock.view', 'movimientos-stock.create', 'movimientos-stock.export',
                'alertas-stock.view',
                'proveedores.view', 'proveedores.create', 'proveedores.update', 'proveedores.delete',
                'compras.view', 'compras.create', 'compras.update', 'compras.delete',
            ],
        ],
    ];

    public function run(): void
    {
        $tenantIds = Tenant::query()->pluck('id')->all();

        if ($tenantIds === []) {
            $this->command?->warn('TenantRolesSeeder: no hay tenants; nada que sembrar. Los roles se crean al provisionar cada taller.');

            return;
        }

        foreach ($tenantIds as $tenantId) {
            $this->seedForTenant((string) $tenantId);
        }
    }

    /**
     * Crea/actualiza los roles base para un tenant concreto.
     *
     * @param  bool  $forceSync  Si true, `syncPermissions` (pisa customizaciones
     *                           del rol base). Si false (default), solo añade
     *                           permisos del catálogo que aún no tenga el rol.
     */
    public function seedForTenant(string $tenantId, bool $forceSync = false): void
    {
        $guard = config('auth.defaults.guard', 'web');

        if (! Schema::hasTable(config('permission.table_names.roles'))) {
            $this->command?->error('No existe la tabla de roles. Ejecuta `php artisan migrate` primero.');

            return;
        }

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId($tenantId);

        try {
            $validPermissionNames = Permission::query()
                ->where('guard_name', $guard)
                ->pluck('name')
                ->all();
            $validPermissionSet = array_flip($validPermissionNames);

            if ($validPermissionSet === []) {
                $this->command?->warn('No hay permisos en BD. Corre primero: php artisan db:seed --class=PermissionsSeeder');

                return;
            }

            foreach (self::ROLES as $name => $definition) {
                $role = Role::query()->firstOrCreate(
                    [
                        'name' => $name,
                        'guard_name' => $guard,
                        'tenant_id' => $tenantId,
                    ],
                    ['description' => $definition['description']],
                );

                if ($role->description !== $definition['description']) {
                    $role->description = $definition['description'];
                    $role->save();
                }

                $perms = array_values(array_filter(
                    $definition['permissions'],
                    fn (string $perm) => isset($validPermissionSet[$perm]),
                ));

                if ($forceSync) {
                    $role->syncPermissions($perms);
                } else {
                    $existing = $role->permissions->pluck('name')->all();
                    $toAdd = array_values(array_diff($perms, $existing));

                    if ($toAdd !== []) {
                        $role->givePermissionTo($toAdd);
                    }
                }
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();
        } finally {
            setPermissionsTeamId($previousTeam);
        }
    }
}
