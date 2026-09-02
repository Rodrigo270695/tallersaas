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
            Schema::create('ventas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('numero', 30);
                $table->uuid('sede_id');
                $table->foreignUuid('caja_sesion_id')->constrained('caja_sesiones')->restrictOnDelete();
                $table->foreignUuid('cliente_id')->constrained('clientes')->restrictOnDelete();
                $table->foreignUuid('vehiculo_id')->nullable()->constrained('vehiculos')->nullOnDelete();
                $table->foreignUuid('orden_trabajo_id')->nullable()->constrained('ordenes_trabajo')->nullOnDelete();
                $table->char('moneda', 3)->default('PEN');
                $table->string('estado', 16)->default('pagado');
                $table->decimal('subtotal', 14, 2)->default(0);
                $table->decimal('igv_monto', 14, 2)->default(0);
                $table->decimal('descuento_monto', 14, 2)->default(0);
                $table->decimal('total', 14, 2)->default(0);
                $table->string('metodo_pago', 24);
                $table->decimal('monto_recibido', 14, 2)->nullable();
                $table->decimal('vuelto', 14, 2)->nullable();
                $table->timestampTz('fecha_pago')->nullable();
                $table->text('notas')->nullable();
                $table->timestampTz('anulado_at')->nullable();
                $table->uuid('anulado_por_id')->nullable();
                $table->string('motivo_anulacion', 255)->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique('numero');
                $table->index('sede_id');
                $table->index('estado');
                $table->index('orden_trabajo_id');
            });

            Schema::create('venta_lineas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('venta_id')->constrained('ventas')->cascadeOnDelete();
                $table->string('tipo_linea', 16)->default('servicio');
                $table->string('descripcion', 500);
                $table->decimal('cantidad', 12, 3)->default(1);
                $table->decimal('precio_unitario', 14, 4);
                $table->decimal('descuento_importe', 14, 2)->default(0);
                $table->decimal('subtotal', 14, 2)->default(0);
                $table->unsignedSmallInteger('orden')->default(0);
            });

            Schema::create('venta_pagos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('venta_id')->constrained('ventas')->cascadeOnDelete();
                $table->string('metodo', 24);
                $table->decimal('monto', 14, 2);
                $table->decimal('monto_recibido', 14, 2)->nullable();
                $table->decimal('vuelto', 14, 2)->nullable();
                $table->unsignedSmallInteger('orden')->default(0);
                $table->timestampsTz();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE ventas ADD CONSTRAINT ventas_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE ventas ADD CONSTRAINT ventas_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE ventas ADD CONSTRAINT ventas_anulado_por_fk FOREIGN KEY (anulado_por_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE ventas ADD CONSTRAINT chk_ventas_estado CHECK (estado IN ('pendiente', 'pagado', 'parcial', 'anulado'))");
                DB::statement("ALTER TABLE venta_pagos ADD CONSTRAINT chk_venta_pagos_metodo CHECK (metodo IN ('efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('venta_pagos');
            Schema::dropIfExists('venta_lineas');
            Schema::dropIfExists('ventas');
        });
    }
};
