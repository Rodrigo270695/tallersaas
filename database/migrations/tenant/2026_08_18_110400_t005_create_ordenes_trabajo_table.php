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
            Schema::create('ordenes_trabajo', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('sede_id');
                $table->string('numero', 30);
                $table->foreignUuid('cliente_id')->constrained('clientes')->restrictOnDelete();
                $table->foreignUuid('vehiculo_id')->constrained('vehiculos')->restrictOnDelete();
                $table->string('estado', 30)->default('abierta');
                $table->timestampTz('ingreso_at')->nullable();
                $table->timestampTz('prometida_at')->nullable();
                $table->timestampTz('lista_at')->nullable();
                $table->timestampTz('entregada_at')->nullable();
                $table->unsignedInteger('km_ingreso')->nullable();
                $table->unsignedInteger('km_salida')->nullable();
                $table->text('solicitud_cliente')->nullable();
                $table->text('diagnostico')->nullable();
                $table->text('notas_internas')->nullable();
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->decimal('descuento_total', 12, 2)->default(0);
                $table->decimal('igv_total', 12, 2)->default(0);
                $table->decimal('total', 12, 2)->default(0);
                $table->decimal('pagado_total', 12, 2)->default(0);
                $table->decimal('saldo', 12, 2)->default(0);
                $table->timestampTz('lista_notificada_at')->nullable();
                $table->timestampTz('anulada_at')->nullable();
                $table->string('anulado_motivo', 255)->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->uuid('closed_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique('numero');
                $table->index('sede_id');
                $table->index('estado');
                $table->index('cliente_id');
                $table->index('vehiculo_id');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE ordenes_trabajo ADD CONSTRAINT ordenes_trabajo_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE ordenes_trabajo ADD CONSTRAINT ordenes_trabajo_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE ordenes_trabajo ADD CONSTRAINT ordenes_trabajo_closed_by_fk FOREIGN KEY (closed_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE ordenes_trabajo ADD CONSTRAINT chk_ordenes_trabajo_estado CHECK (estado IN ('abierta', 'en_proceso', 'lista', 'entregada', 'anulada'))");
                DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
                DB::statement(
                    'CREATE INDEX IF NOT EXISTS idx_ordenes_trabajo_numero_trgm '
                    .'ON ordenes_trabajo USING GIN (numero gin_trgm_ops)',
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('ordenes_trabajo');
        });
    }
};
