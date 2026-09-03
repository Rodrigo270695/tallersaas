<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('servicio_kit_items', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('servicio_id')
                    ->constrained('servicios')
                    ->cascadeOnDelete();
                $table->foreignUuid('producto_id')
                    ->constrained('productos')
                    ->restrictOnDelete();
                $table->decimal('cantidad', 14, 3);
                $table->unsignedSmallInteger('orden')->default(0);
                $table->timestampsTz();

                $table->unique(['servicio_id', 'producto_id']);
                $table->index('servicio_id');
                $table->index('producto_id');
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('servicio_kit_items');
        });
    }
};
