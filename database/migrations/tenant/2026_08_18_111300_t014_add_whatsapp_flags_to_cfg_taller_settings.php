<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('cfg_taller_settings', function (Blueprint $table): void {
                $table->boolean('notificar_cita_whatsapp_activo')->default(true);
                $table->boolean('recordatorio_48h_activo')->default(true);
                $table->boolean('recordatorio_2h_activo')->default(true);
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('cfg_taller_settings', function (Blueprint $table): void {
                $table->dropColumn([
                    'notificar_cita_whatsapp_activo',
                    'recordatorio_48h_activo',
                    'recordatorio_2h_activo',
                ]);
            });
        });
    }
};
