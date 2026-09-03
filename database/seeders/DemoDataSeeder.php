<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Console\Commands\ResetDemoCommand;
use App\Models\Sede;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Limpia tablas operativas del tenant demo y deja datos mínimos de prueba.
 *
 * Idempotente: TRUNCATE + reinsert. Lo invoca `tallersaas:reset-demo`
 * (cron 02:00 vía `schedule:run`). No usa .env.
 */
final class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->command?->warn('DemoDataSeeder requiere PostgreSQL. Omitido.');

            return;
        }

        $slug = ResetDemoCommand::DEMO_SLUG;
        $adminEmail = ResetDemoCommand::DEMO_EMAIL;
        $sedeCodigo = ResetDemoCommand::DEMO_SEDE_CODIGO;

        $tenant = Tenant::query()->where('slug', $slug)->first();

        if ($tenant === null) {
            $this->command?->error("Tenant \"{$slug}\" no existe. Ejecuta DemoTenantSeeder primero.");

            return;
        }

        $adminUser = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('email', $adminEmail)
            ->first();

        if ($adminUser === null) {
            $this->command?->error("Usuario {$adminEmail} no encontrado.");

            return;
        }

        $sede = Sede::query()
            ->where('tenant_id', $tenant->id)
            ->where('codigo', $sedeCodigo)
            ->first()
            ?? Sede::query()->where('tenant_id', $tenant->id)->orderBy('codigo')->first();

        if ($sede === null) {
            $this->command?->error('No hay sedes para el tenant demo.');

            return;
        }

        $schemaName = (string) $tenant->schema_name;
        DB::statement('SET search_path TO "'.$schemaName.'", public');

        try {
            $this->truncateOperationalTables();
            $this->command?->info('  → Tablas operativas limpiadas.');

            $clientes = $this->seedClientes();
            $this->command?->info('  → '.count($clientes).' clientes insertados.');

            $this->seedVehiculos($clientes);
            $this->command?->info('  → Vehículos de ejemplo insertados.');

            $productos = $this->seedProductos($adminUser->id);
            $this->command?->info('  → '.count($productos).' productos insertados.');

            $this->seedStock($productos, (string) $sede->id, $adminUser->id);
            $this->command?->info('  → Stock sembrado en '.$sede->nombre.'.');

            $this->seedServicios($adminUser->id);
            $this->command?->info('  → Servicios de ejemplo insertados.');

            $this->command?->info('✓ Datos demo listos.');
        } finally {
            DB::statement('SET search_path TO public');
        }
    }

    private function truncateOperationalTables(): void
    {
        $tables = [
            'orden_trabajo_fotos',
            'servicio_kit_items',
            'compra_lineas',
            'compras',
            'proveedores',
            'fel_documents',
            'fel_series',
            'presupuesto_items',
            'presupuestos',
            'notifications_queue',
            'citas',
            'orden_trabajo_lineas',
            'ordenes_trabajo',
            'venta_pagos',
            'venta_lineas',
            'ventas',
            'caja_egresos',
            'caja_sesiones',
            'movimientos_inventario',
            'existencias_sede',
            'productos',
            'categorias_productos',
            'servicios',
            'categorias_servicios',
            'vehiculos',
            'modelos',
            'marcas',
            'clientes',
        ];

        foreach ($tables as $table) {
            if (! $this->tableExists($table)) {
                continue;
            }

            DB::statement('TRUNCATE TABLE "'.$table.'" CASCADE');
        }
    }

    private function tableExists(string $table): bool
    {
        return (bool) DB::selectOne(
            'select exists (
                select 1 from information_schema.tables
                where table_schema = current_schema() and table_name = ?
            ) as ok',
            [$table],
        )?->ok;
    }

    /**
     * @return list<array{id: string, nombres: string}>
     */
    private function seedClientes(): array
    {
        $now = now();
        $rows = [
            ['nombres' => 'Carlos', 'apellidos' => 'Ríos Mendoza', 'doc' => '43215678', 'tel' => '987654321'],
            ['nombres' => 'María', 'apellidos' => 'Torres Vega', 'doc' => '52341890', 'tel' => '976543210'],
            ['nombres' => 'José', 'apellidos' => 'Ramírez Castro', 'doc' => '71234567', 'tel' => '965432109'],
        ];

        $out = [];

        foreach ($rows as $row) {
            $id = (string) Str::uuid();
            DB::table('clientes')->insert([
                'id' => $id,
                'nombres' => $row['nombres'],
                'apellidos' => $row['apellidos'],
                'tipo_documento' => 'DNI',
                'numero_documento' => $row['doc'],
                'telefono' => $row['tel'],
                'email' => null,
                'direccion' => 'Chiclayo, Lambayeque',
                'activo' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $out[] = ['id' => $id, 'nombres' => $row['nombres']];
        }

        return $out;
    }

    /**
     * @param  list<array{id: string, nombres: string}>  $clientes
     */
    private function seedVehiculos(array $clientes): void
    {
        if ($clientes === [] || ! $this->tableExists('vehiculos')) {
            return;
        }

        $now = now();
        $placas = ['ABC-123', 'XYZ-456', 'CHI-789'];

        foreach ($clientes as $i => $cliente) {
            $payload = [
                'id' => (string) Str::uuid(),
                'cliente_id' => $cliente['id'],
                'placa' => $placas[$i] ?? 'DEM-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                'color' => 'Blanco',
                'anio' => 2018 + $i,
                'kilometraje' => 45000 + ($i * 12000),
                'vin' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if ($this->columnExists('vehiculos', 'tipo')) {
                $payload['tipo'] = 'auto';
            }
            if ($this->columnExists('vehiculos', 'activo')) {
                $payload['activo'] = true;
            }
            if ($this->columnExists('vehiculos', 'marca')) {
                $payload['marca'] = 'Toyota';
            }
            if ($this->columnExists('vehiculos', 'modelo')) {
                $payload['modelo'] = 'Yaris';
            }
            if ($this->columnExists('vehiculos', 'marca_id')) {
                $payload['marca_id'] = null;
            }
            if ($this->columnExists('vehiculos', 'modelo_id')) {
                $payload['modelo_id'] = null;
            }
            if ($this->columnExists('vehiculos', 'foto_path')) {
                $payload['foto_path'] = null;
            }

            DB::table('vehiculos')->insert($payload);
        }
    }

    /**
     * @return list<array{id: string, nombre: string}>
     */
    private function seedProductos(string $adminId): array
    {
        if (! $this->tableExists('productos')) {
            return [];
        }

        $now = now();
        $categoriaId = null;

        if ($this->tableExists('categorias_productos')) {
            $categoriaId = (string) Str::uuid();
            DB::table('categorias_productos')->insert([
                'id' => $categoriaId,
                'nombre' => 'Repuestos generales',
                'slug' => 'repuestos-generales',
                'descripcion' => 'Catálogo demo',
                'orden' => 1,
                'activo' => true,
                'created_by_id' => $adminId,
                'updated_by_id' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $items = [
            ['nombre' => 'Filtro de aceite', 'sku' => 'FA-001', 'precio' => 35.00, 'unidad' => 'UN'],
            ['nombre' => 'Pastillas de freno', 'sku' => 'PF-010', 'precio' => 85.00, 'unidad' => 'PAR'],
            ['nombre' => 'Aceite 5W-30 1L', 'sku' => 'AC-530', 'precio' => 42.50, 'unidad' => 'LT'],
        ];

        $out = [];

        foreach ($items as $item) {
            $id = (string) Str::uuid();
            $payload = [
                'id' => $id,
                'categoria_id' => $categoriaId,
                'nombre' => $item['nombre'],
                'slug' => Str::slug($item['sku'].'-'.$item['nombre']),
                'sku' => $item['sku'],
                'descripcion' => null,
                'unidad' => $item['unidad'],
                'precio_venta' => number_format($item['precio'], 2, '.', ''),
                'precio_compra' => null,
                'stock_minimo' => 2,
                'activo' => true,
                'created_by_id' => $adminId,
                'updated_by_id' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if ($this->columnExists('productos', 'foto_path')) {
                $payload['foto_path'] = null;
            }

            DB::table('productos')->insert($payload);
            $out[] = ['id' => $id, 'nombre' => $item['nombre']];
        }

        return $out;
    }

    /**
     * @param  list<array{id: string, nombre: string}>  $productos
     */
    private function seedStock(array $productos, string $sedeId, string $adminId): void
    {
        if ($productos === [] || ! $this->tableExists('existencias_sede')) {
            return;
        }

        $now = now();

        foreach ($productos as $i => $producto) {
            $qty = 10 + ($i * 5);
            DB::table('existencias_sede')->insert([
                'id' => (string) Str::uuid(),
                'producto_id' => $producto['id'],
                'sede_id' => $sedeId,
                'cantidad' => number_format($qty, 3, '.', ''),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if (! $this->tableExists('movimientos_inventario')) {
                continue;
            }

            $mov = [
                'id' => (string) Str::uuid(),
                'producto_id' => $producto['id'],
                'sede_id' => $sedeId,
                'tipo' => 'entrada',
                'delta' => number_format($qty, 3, '.', ''),
                'stock_anterior' => '0.000',
                'stock_despues' => number_format($qty, 3, '.', ''),
                'notas' => 'Stock inicial demo',
                'venta_id' => null,
                'created_by_id' => $adminId,
                'created_at' => $now,
            ];

            if ($this->columnExists('movimientos_inventario', 'compra_id')) {
                $mov['compra_id'] = null;
            }

            DB::table('movimientos_inventario')->insert($mov);
        }
    }

    private function seedServicios(string $adminId): void
    {
        if (! $this->tableExists('servicios')) {
            return;
        }

        $now = now();
        $categoriaId = null;

        if ($this->tableExists('categorias_servicios')) {
            $categoriaId = (string) Str::uuid();
            DB::table('categorias_servicios')->insert([
                'id' => $categoriaId,
                'nombre' => 'Mantenimiento',
                'slug' => 'mantenimiento',
                'descripcion' => null,
                'orden' => 1,
                'activo' => true,
                'created_by_id' => $adminId,
                'updated_by_id' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach (
            [
                ['nombre' => 'Cambio de aceite', 'precio' => 50.00, 'slug' => 'cambio-de-aceite'],
                ['nombre' => 'Alineamiento y balanceo', 'precio' => 80.00, 'slug' => 'alineamiento-balanceo'],
            ] as $servicio
        ) {
            DB::table('servicios')->insert([
                'id' => (string) Str::uuid(),
                'categoria_id' => $categoriaId,
                'nombre' => $servicio['nombre'],
                'slug' => $servicio['slug'],
                'descripcion' => null,
                'precio' => number_format($servicio['precio'], 2, '.', ''),
                'duracion_minutos' => 60,
                'activo' => true,
                'created_by_id' => $adminId,
                'updated_by_id' => $adminId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    private function columnExists(string $table, string $column): bool
    {
        return (bool) DB::selectOne(
            'select exists (
                select 1 from information_schema.columns
                where table_schema = current_schema()
                  and table_name = ?
                  and column_name = ?
            ) as ok',
            [$table, $column],
        )?->ok;
    }
}
