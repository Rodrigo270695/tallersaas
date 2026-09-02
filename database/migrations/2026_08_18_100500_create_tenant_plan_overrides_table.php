<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Excepciones puntuales de features de plan otorgadas por soporte a un
     * taller concreto (ej. "3 sedes extra por 60 días"), sin tocar el plan
     * base ni afectar a otros tenants.
     */
    public function up(): void
    {
        Schema::create('tenant_plan_overrides', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('feature', 40);
            $table->unsignedInteger('extra')->default(0);
            $table->integer('override')->nullable();
            $table->string('motivo', 255)->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->foreignUuid('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'feature']);
            $table->index(['tenant_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_plan_overrides');
    }
};
