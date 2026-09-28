<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $guard = config('auth.defaults.guard', 'web');

        $catalog = [
            'admin_taller' => [
                'aseguradoras.view', 'aseguradoras.create', 'aseguradoras.update', 'aseguradoras.delete',
                'siniestros.view', 'siniestros.create', 'siniestros.update', 'siniestros.delete',
            ],
            'recepcionista' => [
                'aseguradoras.view', 'aseguradoras.create', 'aseguradoras.update',
                'siniestros.view', 'siniestros.create', 'siniestros.update',
            ],
            'mecanico' => [
                'aseguradoras.view',
                'siniestros.view',
            ],
        ];

        foreach (array_unique(array_merge(...array_values($catalog))) as $name) {
            Permission::findOrCreate($name, $guard);
        }

        foreach ($catalog as $roleName => $permissions) {
            Role::query()
                ->where('name', $roleName)
                ->where('guard_name', $guard)
                ->each(function (Role $role) use ($permissions): void {
                    $role->givePermissionTo($permissions);
                });
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Los permisos del catálogo se conservan: quitarlos rompería roles ya personalizados.
    }
};
