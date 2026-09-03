<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE presupuestos ALTER COLUMN vehiculo_id DROP NOT NULL');
            } else {
                Schema::table('presupuestos', function ($table): void {
                    $table->uuid('vehiculo_id')->nullable()->change();
                });
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE presupuestos ALTER COLUMN vehiculo_id SET NOT NULL');
            }
        });
    }
};
