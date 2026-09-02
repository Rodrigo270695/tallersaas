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
            Schema::create('presupuestos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id');
                $table->string('numero', 30);
                $table->foreignUuid('cliente_id')->constrained('clientes')->restrictOnDelete();
                $table->foreignUuid('vehiculo_id')->constrained('vehiculos')->restrictOnDelete();
                $table->foreignUuid('orden_trabajo_id')->nullable()->constrained('ordenes_trabajo')->nullOnDelete();
                $table->string('estado', 30)->default('borrador');
                $table->text('diagnostico')->nullable();
                $table->text('notas_internas')->nullable();
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->decimal('descuento_total', 12, 2)->default(0);
                $table->decimal('igv_total', 12, 2)->default(0);
                $table->decimal('total', 12, 2)->default(0);
                $table->date('valido_hasta')->nullable();
                $table->uuid('public_token')->unique();
                $table->timestampTz('enviado_at')->nullable();
                $table->timestampTz('aprobado_at')->nullable();
                $table->timestampTz('rechazado_at')->nullable();
                $table->string('rechazo_motivo', 255)->nullable();
                $table->timestampTz('convertido_at')->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique('numero');
                $table->index('sede_id');
                $table->index('estado');
                $table->index('orden_trabajo_id');
                $table->index('cliente_id');
            });

            Schema::create('presupuesto_items', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('presupuesto_id')->constrained('presupuestos')->cascadeOnDelete();
                $table->string('tipo', 16)->default('otro');
                $table->foreignUuid('servicio_id')->nullable()->constrained('servicios')->nullOnDelete();
                $table->foreignUuid('producto_id')->nullable()->constrained('productos')->nullOnDelete();
                $table->string('descripcion', 500);
                $table->decimal('cantidad', 12, 3)->default(1);
                $table->decimal('precio_unitario', 14, 4)->default(0);
                $table->decimal('subtotal', 14, 2)->default(0);
                $table->unsignedSmallInteger('orden')->default(0);
                $table->timestampsTz();

                $table->index(['presupuesto_id', 'orden']);
            });

            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->foreignUuid('presupuesto_id')->nullable()->after('cita_id')->constrained('presupuestos')->nullOnDelete();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE presupuestos ADD CONSTRAINT chk_presupuestos_estado CHECK (estado IN ('borrador', 'enviado', 'aprobado', 'rechazado', 'vencido', 'convertido'))");
                DB::statement("ALTER TABLE presupuesto_items ADD CONSTRAINT chk_presupuesto_items_tipo CHECK (tipo IN ('servicio', 'producto', 'otro'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('presupuesto_id');
            });
            Schema::dropIfExists('presupuesto_items');
            Schema::dropIfExists('presupuestos');
        });
    }
};
