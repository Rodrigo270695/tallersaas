<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('aseguradoras', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('nombre', 120);
                $table->string('ruc', 20)->nullable();
                $table->string('telefono', 30)->nullable();
                $table->string('email', 120)->nullable();
                $table->boolean('activo')->default(true);
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index('nombre');
            });

            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->foreignUuid('aseguradora_id')
                    ->nullable()
                    ->after('activo')
                    ->constrained('aseguradoras')
                    ->nullOnDelete();
                $table->string('numero_poliza', 40)->nullable()->after('aseguradora_id');
                $table->decimal('cobertura_pct', 5, 2)->nullable()->after('numero_poliza');
            });

            Schema::create('siniestros', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('orden_trabajo_id')->constrained('ordenes_trabajo')->restrictOnDelete();
                $table->foreignUuid('aseguradora_id')->constrained('aseguradoras')->restrictOnDelete();
                $table->string('numero', 40);
                $table->string('estado', 20)->default('abierto');
                $table->decimal('cobertura_pct', 5, 2)->nullable();
                $table->decimal('monto_reclamado', 14, 2);
                $table->decimal('monto_seguro', 14, 2);
                $table->decimal('monto_cliente', 14, 2);
                $table->text('notas')->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index('estado');
                $table->index('numero');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('siniestros');

            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('aseguradora_id');
                $table->dropColumn(['numero_poliza', 'cobertura_pct']);
            });

            Schema::dropIfExists('aseguradoras');
        });
    }
};
