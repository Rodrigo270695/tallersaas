<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FK al catálogo oficial de distritos.
 *
 * Los strings `distrito` / `provincia` / `departamento` se mantienen
 * como cache denormalizado hidratado desde `distrito_id`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->foreignId('distrito_id')
                ->nullable()
                ->after('email')
                ->constrained('distritos')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('distrito_id');
        });
    }
};
