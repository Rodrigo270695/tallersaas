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
            Schema::create('categorias_productos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('nombre', 120);
                $table->string('slug', 140)->nullable();
                $table->text('descripcion')->nullable();
                $table->unsignedSmallInteger('orden')->default(0);
                $table->boolean('activo')->default(true);
                $table->uuid('created_by_id')->nullable();
                $table->uuid('updated_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index('activo');
                $table->index('orden');
                $table->unique('slug');
            });

            Schema::create('productos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('categoria_id')->nullable()->constrained('categorias_productos')->nullOnDelete();
                $table->string('nombre', 255);
                $table->string('slug', 160)->nullable();
                $table->text('descripcion')->nullable();
                $table->string('sku', 64)->nullable();
                $table->string('codigo_barras', 64)->nullable();
                $table->string('unidad', 20)->default('UN');
                $table->decimal('precio_venta', 10, 2)->nullable();
                $table->decimal('precio_compra', 10, 2)->nullable();
                $table->decimal('stock_minimo', 12, 3)->nullable();
                $table->boolean('activo')->default(true);
                $table->uuid('created_by_id')->nullable();
                $table->uuid('updated_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index('categoria_id');
                $table->index('activo');
                $table->index('nombre');
                $table->unique('slug');
                $table->unique('sku');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE categorias_productos ADD CONSTRAINT categorias_productos_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE categorias_productos ADD CONSTRAINT categorias_productos_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE productos ADD CONSTRAINT productos_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE productos ADD CONSTRAINT productos_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('productos');
            Schema::dropIfExists('categorias_productos');
        });
    }
};
