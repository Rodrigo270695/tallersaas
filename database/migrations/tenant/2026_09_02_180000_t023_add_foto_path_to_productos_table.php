<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foto opcional del repuesto (path relativo en el disco `public`).
 */
return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('productos', function (Blueprint $table): void {
                $table->string('foto_path', 255)->nullable()->after('stock_minimo');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('productos', function (Blueprint $table): void {
                $table->dropColumn('foto_path');
            });
        });
    }
};
