<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabla `users` global (schema public), compartida por el panel central
     * y todos los talleres ("single-login + datos aislados", igual que VetSaaS):
     * el mismo modelo autentica a todos; `tenant_id = null` es staff/superadmin
     * del panel central, `tenant_id = <uuid>` es personal de ese taller.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->string('name');
            $table->string('email');
            $table->string('phone', 20)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->boolean('is_active')->default(true);
            $table->boolean('must_change_password')->default(false);
            $table->string('bootstrap_login_token', 64)->nullable()->unique();
            $table->timestampTz('bootstrap_login_expires_at')->nullable();
            $table->timestampTz('last_login_at')->nullable();
            $table->uuid('created_by_id')->nullable();
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->rememberToken();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->unique(['tenant_id', 'email']);
            $table->index('tenant_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('created_by_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->uuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users ADD CONSTRAINT chk_users_bootstrap_token_format CHECK (bootstrap_login_token IS NULL OR bootstrap_login_token ~ '^[a-f0-9]{64}$')");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
