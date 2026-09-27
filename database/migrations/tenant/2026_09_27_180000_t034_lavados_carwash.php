<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('lavados', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('numero', 20);
                $table->uuid('sede_id');
                $table->foreignUuid('cliente_id')->constrained('clientes')->restrictOnDelete();
                $table->foreignUuid('vehiculo_id')->nullable()->constrained('vehiculos')->nullOnDelete();
                $table->string('placa', 12);
                $table->string('estado', 20)->default('abierto');
                $table->text('notas')->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique('numero');
                $table->index('sede_id');
                $table->index('estado');
                $table->index('placa');
            });

            Schema::create('lavado_lineas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('lavado_id')->constrained('lavados')->cascadeOnDelete();
                $table->foreignUuid('servicio_id')->nullable()->constrained('servicios')->nullOnDelete();
                $table->string('descripcion', 500);
                $table->decimal('cantidad', 12, 3);
                $table->decimal('precio_unitario', 12, 4);
                $table->unsignedSmallInteger('orden')->default(0);
                $table->timestampsTz();

                $table->index('lavado_id');
            });

            Schema::table('ventas', function (Blueprint $table): void {
                $table->foreignUuid('lavado_id')->nullable()->after('orden_trabajo_id')->constrained('lavados')->nullOnDelete();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE lavados ADD CONSTRAINT lavados_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE lavados ADD CONSTRAINT lavados_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE lavados ADD CONSTRAINT chk_lavados_estado CHECK (estado IN ('abierto', 'cobrado', 'anulado'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('ventas', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('lavado_id');
            });

            Schema::dropIfExists('lavado_lineas');
            Schema::dropIfExists('lavados');
        });
    }
};
