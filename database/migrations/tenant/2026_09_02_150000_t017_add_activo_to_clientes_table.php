<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('clientes', function (Blueprint $table): void {
                $table->boolean('activo')->default(true);
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('clientes', function (Blueprint $table): void {
                $table->dropColumn('activo');
            });
        });
    }
};
