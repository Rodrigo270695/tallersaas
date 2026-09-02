<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

/**
 * {@see RefreshDatabase} para suites que solo son válidas con PostgreSQL (migraciones / tenant).
 *
 * - Si el driver no es `pgsql`, omite el caso **antes** de `migrate:fresh` (evita errores SQL en SQLite).
 * - Si es PostgreSQL pero la base no parece dedicada a tests, omite (evita borrar datos de desarrollo).
 */
trait RefreshDatabaseWithPgsqlSafety
{
    use RefreshDatabase {
        beforeRefreshingDatabase as laravelBeforeRefreshingDatabase;
        beginDatabaseTransaction as laravelBeginDatabaseTransaction;
    }

    protected function beforeRefreshingDatabase(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Esta suite requiere PostgreSQL (multi-schema tenant).');

            return;
        }

        TenantMigrateTestGuards::guardIfUnsafePgsql($this);

        $this->laravelBeforeRefreshingDatabase();
    }

    /**
     * Los tests de tenant provisionan un schema real vía `TenantSchemaMigrator`
     * (CREATE SCHEMA + `migrate --path=tenant`), que internamente hace
     * `DB::rollBack()`/`DB::reconnect()` para dejar la conexión limpia tras
     * migrar (comportamiento pensado para uso real en producción). Envolver
     * el test en la transacción de {@see RefreshDatabase} rompería ese flujo:
     * el rollback forzado del migrador descartaría TODO lo sembrado antes en
     * el mismo test (permisos, roles, el propio schema recién creado).
     *
     * Por eso estas suites renuncian al aislamiento transaccional por test y
     * limpian manualmente lo que crean (ver {@see CreatesTestTenant::tearDownTestTenant()}).
     */
    protected function beginDatabaseTransaction(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->laravelBeginDatabaseTransaction();

            return;
        }
    }
}
