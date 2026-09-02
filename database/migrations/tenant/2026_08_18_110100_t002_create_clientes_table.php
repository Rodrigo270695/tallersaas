<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('clientes', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('nombres', 150);
                $table->string('apellidos', 150)->nullable();
                $table->string('tipo_documento', 10)->default('DNI');
                $table->string('numero_documento', 15)->nullable();
                $table->string('telefono', 20)->nullable();
                $table->string('email', 150)->nullable();
                $table->string('direccion', 255)->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique(['tipo_documento', 'numero_documento']);
                $table->index('nombres');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('clientes');
        });
    }
};
