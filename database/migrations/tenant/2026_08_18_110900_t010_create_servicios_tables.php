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
            Schema::create('categorias_servicios', function (Blueprint $table): void {
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

            Schema::create('servicios', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('categoria_id')->nullable()->constrained('categorias_servicios')->nullOnDelete();
                $table->string('nombre', 255);
                $table->string('slug', 160)->nullable();
                $table->text('descripcion')->nullable();
                $table->decimal('precio', 10, 2)->default(0);
                $table->unsignedSmallInteger('duracion_minutos')->nullable();
                $table->boolean('activo')->default(true);
                $table->uuid('created_by_id')->nullable();
                $table->uuid('updated_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index('categoria_id');
                $table->index('activo');
                $table->index('nombre');
                $table->unique('slug');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE categorias_servicios ADD CONSTRAINT categorias_servicios_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE categorias_servicios ADD CONSTRAINT categorias_servicios_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE servicios ADD CONSTRAINT servicios_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE servicios ADD CONSTRAINT servicios_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('servicios');
            Schema::dropIfExists('categorias_servicios');
        });
    }
};
