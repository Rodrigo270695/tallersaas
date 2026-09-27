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
            Schema::create('puestos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id');
                $table->string('nombre', 60);
                $table->boolean('activo')->default(true);
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index('sede_id');
                $table->index('activo');
            });

            Schema::create('orden_trabajo_mecanicos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('orden_trabajo_id')->constrained('ordenes_trabajo')->cascadeOnDelete();
                $table->uuid('user_id');
                $table->string('rol', 20);
                $table->timestampsTz();

                $table->unique(['orden_trabajo_id', 'user_id']);
                $table->index('user_id');
            });

            Schema::create('orden_trabajo_checklist', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('orden_trabajo_id')->constrained('ordenes_trabajo')->cascadeOnDelete();
                $table->string('clave', 40);
                $table->string('estado', 20)->default('na');
                $table->string('nota', 255)->nullable();
                $table->uuid('updated_by_id')->nullable();
                $table->timestampsTz();

                $table->unique(['orden_trabajo_id', 'clave']);
            });

            Schema::create('vehiculo_kilometrajes', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('vehiculo_id')->constrained('vehiculos')->cascadeOnDelete();
                $table->foreignUuid('orden_trabajo_id')->nullable()->constrained('ordenes_trabajo')->nullOnDelete();
                $table->unsignedInteger('km');
                $table->string('origen', 20);
                $table->timestampTz('recorded_at');
                $table->uuid('user_id')->nullable();
                $table->timestampsTz();

                $table->index(['vehiculo_id', 'recorded_at']);
            });

            Schema::table('citas', function (Blueprint $table): void {
                $table->foreignUuid('puesto_id')->nullable()->after('sede_id')->constrained('puestos')->nullOnDelete();
            });

            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->foreignUuid('puesto_id')->nullable()->after('sede_id')->constrained('puestos')->nullOnDelete();
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE puestos ADD CONSTRAINT puestos_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE puestos ADD CONSTRAINT puestos_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE orden_trabajo_mecanicos ADD CONSTRAINT ot_mecanicos_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE');
                DB::statement("ALTER TABLE orden_trabajo_mecanicos ADD CONSTRAINT chk_ot_mecanicos_rol CHECK (rol IN ('responsable', 'apoyo'))");
                DB::statement('ALTER TABLE orden_trabajo_checklist ADD CONSTRAINT ot_checklist_user_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE orden_trabajo_checklist ADD CONSTRAINT chk_ot_checklist_estado CHECK (estado IN ('ok', 'observacion', 'na'))");
                DB::statement('ALTER TABLE vehiculo_kilometrajes ADD CONSTRAINT vehiculo_km_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE vehiculo_kilometrajes ADD CONSTRAINT chk_vehiculo_km_origen CHECK (origen IN ('ingreso', 'salida', 'manual'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('puesto_id');
            });
            Schema::table('citas', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('puesto_id');
            });
            Schema::dropIfExists('vehiculo_kilometrajes');
            Schema::dropIfExists('orden_trabajo_checklist');
            Schema::dropIfExists('orden_trabajo_mecanicos');
            Schema::dropIfExists('puestos');
        });
    }
};
