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
            Schema::create('caja_sesiones', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id');
                $table->string('estado', 16)->default('abierta');
                $table->char('moneda', 3)->default('PEN');
                $table->decimal('saldo_apertura', 14, 2)->default(0);
                $table->decimal('saldo_cierre_efectivo', 14, 2)->nullable();
                $table->json('arqueo_json')->nullable();
                $table->timestampTz('opened_at')->useCurrent();
                $table->timestampTz('closed_at')->nullable();
                $table->text('notas')->nullable();
                $table->uuid('opened_by_id');
                $table->uuid('closed_by_id')->nullable();
                $table->timestampsTz();

                $table->index(['sede_id', 'estado']);
                $table->index(['opened_by_id', 'opened_at']);
            });

            Schema::create('caja_egresos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('caja_sesion_id')->constrained('caja_sesiones')->cascadeOnDelete();
                $table->decimal('monto', 14, 2);
                $table->string('motivo', 32);
                $table->string('descripcion', 255)->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();

                $table->index('caja_sesion_id');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE caja_sesiones ADD CONSTRAINT caja_sesiones_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE caja_sesiones ADD CONSTRAINT caja_sesiones_opened_by_fk FOREIGN KEY (opened_by_id) REFERENCES public.users (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE caja_sesiones ADD CONSTRAINT caja_sesiones_closed_by_fk FOREIGN KEY (closed_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE caja_sesiones ADD CONSTRAINT chk_caja_sesiones_estado CHECK (estado IN ('abierta', 'cerrada'))");
                DB::statement('ALTER TABLE caja_egresos ADD CONSTRAINT caja_egresos_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('caja_egresos');
            Schema::dropIfExists('caja_sesiones');
        });
    }
};
