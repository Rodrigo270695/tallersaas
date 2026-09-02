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
            Schema::create('existencias_sede', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('producto_id')->constrained('productos')->cascadeOnDelete();
                $table->uuid('sede_id');
                $table->decimal('cantidad', 14, 3)->default(0);
                $table->timestampsTz();

                $table->unique(['producto_id', 'sede_id']);
                $table->index('sede_id');
            });

            Schema::create('movimientos_inventario', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('producto_id')->constrained('productos')->cascadeOnDelete();
                $table->uuid('sede_id');
                $table->string('tipo', 24);
                $table->decimal('delta', 14, 3);
                $table->decimal('stock_anterior', 14, 3);
                $table->decimal('stock_despues', 14, 3);
                $table->text('notas')->nullable();
                $table->foreignUuid('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
                $table->uuid('created_by_id')->nullable();
                $table->timestampTz('created_at');

                $table->index(['sede_id', 'created_at']);
                $table->index(['producto_id', 'created_at']);
                $table->index('tipo');
            });

            Schema::table('venta_lineas', function (Blueprint $table): void {
                $table->foreignUuid('producto_id')->nullable()->after('venta_id')->constrained('productos')->nullOnDelete();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE existencias_sede ADD CONSTRAINT existencias_sede_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE movimientos_inventario ADD CONSTRAINT chk_movimientos_inventario_tipo CHECK (tipo IN ('entrada', 'salida', 'merma', 'ajuste'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('venta_lineas', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('producto_id');
            });
            Schema::dropIfExists('movimientos_inventario');
            Schema::dropIfExists('existencias_sede');
        });
    }
};
