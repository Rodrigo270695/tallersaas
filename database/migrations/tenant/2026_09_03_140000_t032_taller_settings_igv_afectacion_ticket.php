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
                $table->string('igv_afectacion', 20)->default('gravado')->after('igv_porcentaje');
                $table->unsignedSmallInteger('ticket_ancho_mm')->default(80)->after('precio_incluye_igv');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('cfg_taller_settings', function (Blueprint $table): void {
                $table->dropColumn(['igv_afectacion', 'ticket_ancho_mm']);
            });
        });
    }
};
