<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Support\Facades\DB;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS siniestros_orden_activa_uidx ON siniestros (orden_trabajo_id) WHERE deleted_at IS NULL',
            );
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            DB::statement('DROP INDEX IF EXISTS siniestros_orden_activa_uidx');
        });
    }
};
