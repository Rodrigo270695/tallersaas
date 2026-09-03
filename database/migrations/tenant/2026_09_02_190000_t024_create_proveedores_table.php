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
            Schema::create('proveedores', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->char('ruc', 11);
                $table->string('razon_social', 255);
                $table->text('direccion')->nullable();
                $table->string('ubigeo_sunat', 6)->nullable();
                $table->string('estado_sunat', 32)->nullable();
                $table->string('condicion_sunat', 32)->nullable();
                $table->string('telefono', 40)->nullable();
                $table->string('email', 255)->nullable();
                $table->text('notas')->nullable();
                $table->boolean('activo')->default(true);
                $table->uuid('created_by_id')->nullable();
                $table->uuid('updated_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->unique('ruc');
                $table->index('razon_social');
                $table->index('activo');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE proveedores ADD CONSTRAINT proveedores_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE proveedores ADD CONSTRAINT proveedores_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('proveedores');
        });
    }
};
