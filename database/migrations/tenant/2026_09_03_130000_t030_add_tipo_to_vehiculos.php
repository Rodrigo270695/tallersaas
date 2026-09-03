<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->string('tipo', 20)->default('auto')->after('placa');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->dropColumn('tipo');
            });
        });
    }
};
