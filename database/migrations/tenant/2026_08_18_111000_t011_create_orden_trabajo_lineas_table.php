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
            Schema::create('orden_trabajo_lineas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('orden_trabajo_id')->constrained('ordenes_trabajo')->cascadeOnDelete();
                $table->string('tipo', 16)->default('otro');
                $table->foreignUuid('servicio_id')->nullable()->constrained('servicios')->nullOnDelete();
                $table->foreignUuid('producto_id')->nullable()->constrained('productos')->nullOnDelete();
                $table->string('descripcion', 500);
                $table->decimal('cantidad', 12, 3)->default(1);
                $table->decimal('precio_unitario', 14, 4)->default(0);
                $table->decimal('subtotal', 14, 2)->default(0);
                $table->unsignedSmallInteger('orden')->default(0);
                $table->timestampsTz();

                $table->index(['orden_trabajo_id', 'orden']);
                $table->index('tipo');
            });

            Schema::table('venta_lineas', function (Blueprint $table): void {
                $table->foreignUuid('servicio_id')->nullable()->constrained('servicios')->nullOnDelete();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement("ALTER TABLE orden_trabajo_lineas ADD CONSTRAINT chk_orden_trabajo_lineas_tipo CHECK (tipo IN ('servicio', 'producto', 'otro'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('venta_lineas', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('servicio_id');
            });
            Schema::dropIfExists('orden_trabajo_lineas');
        });
    }
};
