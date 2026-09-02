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
            Schema::create('citas', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id');
                $table->foreignUuid('cliente_id')->constrained('clientes')->restrictOnDelete();
                $table->foreignUuid('vehiculo_id')->constrained('vehiculos')->restrictOnDelete();
                $table->uuid('assigned_user_id')->nullable();
                $table->timestampTz('inicia_at');
                $table->unsignedSmallInteger('duracion_minutos')->default(60);
                $table->string('estado', 30)->default('programada');
                $table->string('motivo', 255)->nullable();
                $table->text('notas')->nullable();
                $table->foreignUuid('orden_trabajo_id')->nullable()->constrained('ordenes_trabajo')->nullOnDelete();
                $table->timestampTz('reminder_sent_at')->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->uuid('updated_by_id')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();

                $table->index('sede_id');
                $table->index(['inicia_at', 'estado']);
                $table->index('cliente_id');
                $table->index('vehiculo_id');
                $table->unique('orden_trabajo_id');
            });

            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->foreignUuid('cita_id')->nullable()->constrained('citas')->nullOnDelete();
                $table->unique('cita_id');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE citas ADD CONSTRAINT citas_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE citas ADD CONSTRAINT citas_assigned_user_fk FOREIGN KEY (assigned_user_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE citas ADD CONSTRAINT citas_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement('ALTER TABLE citas ADD CONSTRAINT citas_updated_by_fk FOREIGN KEY (updated_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE citas ADD CONSTRAINT chk_citas_estado CHECK (estado IN ('programada', 'confirmada', 'en_recepcion', 'convertida', 'no_asistio', 'cancelada'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('cita_id');
            });
            Schema::dropIfExists('citas');
        });
    }
};
