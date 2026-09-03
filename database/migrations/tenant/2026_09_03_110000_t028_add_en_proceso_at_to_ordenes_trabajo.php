<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->timestampTz('en_proceso_at')->nullable()->after('ingreso_at');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->dropColumn('en_proceso_at');
            });
        });
    }
};
