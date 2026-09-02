<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('vehiculos', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('cliente_id')->constrained('clientes')->cascadeOnDelete();
                $table->string('placa', 10);
                $table->string('marca', 60)->nullable();
                $table->string('modelo', 60)->nullable();
                $table->string('color', 40)->nullable();
                $table->unsignedSmallInteger('anio')->nullable();
                $table->unsignedInteger('kilometraje')->nullable();
                $table->string('vin', 30)->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique('placa');
                $table->index('cliente_id');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('vehiculos');
        });
    }
};
