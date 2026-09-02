<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estado del vehículo: activo / inactivo (mismo patrón que clientes).
 */
return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->boolean('activo')->default(true)->after('foto_path');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->dropColumn('activo');
            });
        });
    }
};
