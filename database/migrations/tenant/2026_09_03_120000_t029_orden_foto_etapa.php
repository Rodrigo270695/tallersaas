<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('orden_trabajo_fotos', function (Blueprint $table): void {
                $table->string('etapa', 20)->default('proceso')->after('path');
                $table->index(['orden_trabajo_id', 'etapa']);
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('orden_trabajo_fotos', function (Blueprint $table): void {
                $table->dropIndex(['orden_trabajo_id', 'etapa']);
                $table->dropColumn('etapa');
            });
        });
    }
};
