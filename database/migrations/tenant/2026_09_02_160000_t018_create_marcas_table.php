<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de marcas de vehículo, propio de cada taller (schema).
 *
 * Se siembra con un catálogo base común a todos los tenants (ver
 * `VehiculoMarcaModeloSeeder`), pero cada taller puede crear las suyas
 * desde el combobox de "Nuevo vehículo": al vivir en su propio schema
 * PostgreSQL, esas marcas nuevas solo las ve ese taller, aunque el
 * nombre se repita en otro tenant.
 */
return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('marcas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('nombre', 80);
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique('nombre');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('marcas');
        });
    }
};
