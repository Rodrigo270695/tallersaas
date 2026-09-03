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
            Schema::create('compras', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('proveedor_id')
                    ->nullable()
                    ->constrained('proveedores')
                    ->nullOnDelete();
                /** UUID en `public.sedes` (sin FK cruzada entre schemas). */
                $table->uuid('sede_id');
                $table->string('tipo_comprobante', 16)->default('boleta');
                $table->string('serie', 16)->nullable();
                $table->string('numero_documento', 64)->nullable();
                $table->date('fecha_documento');
                $table->char('moneda', 3)->default('PEN');
                $table->decimal('total', 14, 2)->nullable();
                $table->text('notas')->nullable();
                $table->string('factura_path', 500)->nullable();
                $table->string('factura_original_name', 255)->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->uuid('updated_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index(['sede_id', 'fecha_documento']);
                $table->index('proveedor_id');
            });

            Schema::create('compra_lineas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('compra_id')
                    ->constrained('compras')
                    ->cascadeOnDelete();
                $table->foreignUuid('producto_id')
                    ->constrained('productos')
                    ->restrictOnDelete();
                $table->decimal('cantidad', 14, 3);
                $table->decimal('costo_unitario', 14, 4)->nullable();
                $table->unsignedSmallInteger('orden')->default(0);

                $table->index('compra_id');
                $table->index('producto_id');
            });

            Schema::table('movimientos_inventario', function (Blueprint $table): void {
                $table->foreignUuid('compra_id')
                    ->nullable()
                    ->after('producto_id')
                    ->constrained('compras')
                    ->nullOnDelete();
                $table->index('compra_id');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE compras ADD CONSTRAINT compras_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE compras ADD CONSTRAINT compras_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE compras ADD CONSTRAINT compras_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE compras ADD CONSTRAINT chk_compras_tipo_comprobante CHECK (tipo_comprobante IN ('boleta', 'factura'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('movimientos_inventario', function (Blueprint $table): void {
                $table->dropForeign(['compra_id']);
                $table->dropColumn('compra_id');
            });
            Schema::dropIfExists('compra_lineas');
            Schema::dropIfExists('compras');
        });
    }
};
