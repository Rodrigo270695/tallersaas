<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Orden importa: permisos → planes → superadmin (roles de tenant se
     * siembran al provisionar cada taller, o vía TenantRolesSeeder si ya
     * existen tenants).
     */
    public function run(): void
    {
        $this->call([
            PermissionsSeeder::class,
            PlansAndFeaturesSeeder::class,
            TenantRolesSeeder::class,
            VehiculoMarcaModeloSeeder::class,
            SuperadminSeeder::class,
        ]);
    }
}
