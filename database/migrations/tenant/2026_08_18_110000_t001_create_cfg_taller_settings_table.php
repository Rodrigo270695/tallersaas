<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    /**
     * Fila única de configuración del taller dentro de su propio schema.
     * Igual que `cfg_clinic_settings` en VetSaaS: datos fiscales/branding
     * que solo aplican a ESTE tenant.
     */
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('cfg_taller_settings', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('ruc', 11)->nullable();
                $table->string('razon_social', 200)->nullable();
                $table->string('nombre_comercial', 150)->nullable();
                $table->string('direccion_fiscal', 255)->nullable();
                $table->string('logo_path', 500)->nullable();
                $table->string('email_institucional', 150)->nullable();
                $table->string('telefono_principal', 20)->nullable();
                $table->string('web_url', 200)->nullable();
                $table->json('horario_atencion')->default('{}');
                $table->char('moneda', 3)->default('PEN');
                $table->decimal('igv_porcentaje', 5, 2)->default(18);
                $table->boolean('precio_incluye_igv')->default(true);
                $table->string('color_primario', 7)->nullable();
                $table->string('color_secundario', 7)->nullable();
                $table->timestampsTz();
                $table->uuid('updated_by_id')->nullable();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                // FK al modelo global de usuarios (single-login): el
                // personal del taller vive en `public.users` con su
                // `tenant_id`. No hay tabla `users` dentro de cada schema.
                DB::statement('ALTER TABLE cfg_taller_settings ADD CONSTRAINT cfg_taller_settings_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                // Una sola fila por schema (taller): índice único sobre TRUE.
                DB::statement('CREATE UNIQUE INDEX uq_cfg_taller_settings_single_row ON cfg_taller_settings ((TRUE))');
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('cfg_taller_settings');
        });
    }
};
