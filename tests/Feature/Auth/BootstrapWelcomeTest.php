<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Bootstrap bienvenida requiere PostgreSQL.');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('muestra la pantalla de bienvenida con token válido en el subdominio del tenant', function (): void {
    $plain = Str::random(64);

    $this->testTenantAdmin->forceFill([
        'bootstrap_login_token' => hash('sha256', $plain),
        'bootstrap_login_expires_at' => now()->addDay(),
        'must_change_password' => true,
        'email_verified_at' => null,
    ])->save();

    $url = 'http://'.$this->testTenantHost.'/auth/bienvenida/'.$plain;

    $this->get($url)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/bootstrap-welcome')
            ->where('valid', true)
            ->where('token', $plain));
});

it('tras confirmar redirige a cambiar contraseña', function (): void {
    $plain = Str::random(64);

    $this->testTenantAdmin->forceFill([
        'bootstrap_login_token' => hash('sha256', $plain),
        'bootstrap_login_expires_at' => now()->addDay(),
        'must_change_password' => true,
        'email_verified_at' => null,
    ])->save();

    $url = 'http://'.$this->testTenantHost.'/auth/bienvenida/'.$plain;

    $this->post($url)
        ->assertRedirect(route('password.change.form', absolute: false));

    $admin = User::query()->findOrFail($this->testTenantAdmin->id);
    expect($admin->bootstrap_login_token)->toBeNull();
});

it('usuario con must_change_password no puede ir al dashboard sin cambiar clave', function (): void {
    $this->testTenantAdmin->forceFill([
        'must_change_password' => true,
        'email_verified_at' => null,
    ])->save();

    $this->actingAs($this->testTenantAdmin)
        ->get('http://'.$this->testTenantHost.'/dashboard')
        ->assertRedirect(route('password.change.form', absolute: false));
});
