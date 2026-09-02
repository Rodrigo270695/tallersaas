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
            Schema::table('cfg_taller_settings', function (Blueprint $table) {
                $table->unsignedBigInteger('distrito_id')->nullable()->after('direccion_fiscal');
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement(
                    'ALTER TABLE cfg_taller_settings ADD CONSTRAINT cfg_taller_settings_distrito_fk '
                    .'FOREIGN KEY (distrito_id) REFERENCES public.distritos (id) ON DELETE SET NULL',
                );
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE cfg_taller_settings DROP CONSTRAINT IF EXISTS cfg_taller_settings_distrito_fk');
            }

            Schema::table('cfg_taller_settings', function (Blueprint $table) {
                $table->dropColumn('distrito_id');
            });
        });
    }
};
