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
            Schema::table('aseguradoras', function (Blueprint $table): void {
                $table->string('nombre', 255)->change();
            });

            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS aseguradoras_ruc_activa_uidx ON aseguradoras (ruc) WHERE ruc IS NOT NULL AND deleted_at IS NULL',
            );
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            DB::statement('DROP INDEX IF EXISTS aseguradoras_ruc_activa_uidx');

            Schema::table('aseguradoras', function (Blueprint $table): void {
                $table->string('nombre', 120)->change();
            });
        });
    }
};
