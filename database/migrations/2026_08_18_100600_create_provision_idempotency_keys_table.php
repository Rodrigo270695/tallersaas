<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cachea la respuesta HTTP de `/api/internal/saas/{provision,renew}`
     * por `X-Idempotency-Key`: si Orvae reintenta un pedido, devolvemos la
     * misma respuesta sin crear un tenant/renovación duplicada.
     */
    public function up(): void
    {
        Schema::create('provision_idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->string('key', 150)->unique();
            $table->string('source', 30)->default('orvae');
            $table->uuid('tenant_id')->nullable();
            $table->unsignedSmallInteger('status_code');
            $table->json('response_body');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('expires_at')->nullable();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provision_idempotency_keys');
    }
};
