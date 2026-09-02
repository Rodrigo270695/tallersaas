<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de modelos de vehículo, en cascada bajo una marca.
 *
 * Igual que `marcas`: vive en el schema del tenant, se siembra con un
 * catálogo base (ver `VehiculoMarcaModeloSeeder`) y cada taller puede
 * agregar los suyos sin afectar a otros tenants.
 */
return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('modelos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('marca_id')->constrained('marcas')->cascadeOnDelete();
                $table->string('nombre', 80);
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique(['marca_id', 'nombre']);
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('modelos');
        });
    }
};
