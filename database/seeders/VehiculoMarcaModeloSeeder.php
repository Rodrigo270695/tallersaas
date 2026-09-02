<?php

namespace Database\Seeders;

use App\Models\Marca;
use App\Models\Modelo;
use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Catálogo base de marcas y modelos de vehículo, común a TODOS los
 * talleres (tenants).
 *
 * Cada tenant vive en su propio schema PostgreSQL, así que "compartido
 * entre todos" en la práctica significa: se siembra el MISMO catálogo
 * base en cada schema. A partir de ahí, si un taller crea su propia
 * marca/modelo desde el combobox de "Nuevo vehículo", esa fila solo
 * existe en su schema: ningún otro tenant la ve, aunque repita el
 * nombre (el aislamiento lo da PostgreSQL, no una columna `tenant_id`).
 *
 * Uso:
 *   - `php artisan db:seed --class=VehiculoMarcaModeloSeeder` → siembra
 *     el catálogo en todos los tenants ya existentes.
 *   - Se llama automáticamente desde `TenantProvisioner` al crear un
 *     taller nuevo, así nace con el catálogo base.
 */
class VehiculoMarcaModeloSeeder extends Seeder
{
    /**
     * @var array<string, array<int, string>>
     */
    public const CATALOGO = [
        'TOYOTA' => ['HILUX', 'COROLLA', 'YARIS', 'RAV4', 'LAND CRUISER', 'FORTUNER', 'AVANZA', 'RUSH'],
        'HYUNDAI' => ['ACCENT', 'ELANTRA', 'TUCSON', 'SANTA FE', 'CRETA', 'H1', 'GRAND I10', 'PORTER'],
        'KIA' => ['RIO', 'SPORTAGE', 'SORENTO', 'PICANTO', 'CERATO', 'SOLUTO', 'K2500'],
        'NISSAN' => ['SENTRA', 'VERSA', 'X-TRAIL', 'FRONTIER', 'KICKS', 'NAVARA', 'AD'],
        'CHEVROLET' => ['SAIL', 'SPARK', 'ONIX', 'D-MAX', 'TRACKER', 'N300', 'LUV'],
        'SUZUKI' => ['SWIFT', 'BALENO', 'VITARA', 'ALTO', 'ERTIGA', 'JIMNY', 'APV'],
        'MITSUBISHI' => ['L200', 'MONTERO SPORT', 'OUTLANDER', 'ASX', 'MIRAGE', 'LANCER'],
        'HONDA' => ['CIVIC', 'CR-V', 'HR-V', 'FIT', 'CITY', 'CB 190R', 'XR 150', 'TITAN'],
        'FORD' => ['RANGER', 'ECOSPORT', 'ESCAPE', 'F-150', 'EXPLORER', 'FIESTA'],
        'VOLKSWAGEN' => ['GOL', 'VOYAGE', 'AMAROK', 'TIGUAN', 'POLO', 'SAVEIRO'],
        'MAZDA' => ['MAZDA 2', 'MAZDA 3', 'CX-5', 'CX-30', 'BT-50'],
        'RENAULT' => ['LOGAN', 'SANDERO', 'DUSTER', 'KWID', 'STEPWAY', 'KANGOO'],
        'PEUGEOT' => ['206', '208', '308', '2008', '3008', 'PARTNER'],
        'FIAT' => ['PALIO', 'STRADA', 'TORO', 'MOBI', 'ARGO'],
        'BMW' => ['SERIE 3', 'SERIE 5', 'X1', 'X3', 'X5'],
        'MERCEDES-BENZ' => ['CLASE A', 'CLASE C', 'CLASE E', 'GLA', 'SPRINTER'],
        'AUDI' => ['A3', 'A4', 'Q3', 'Q5'],
        'JEEP' => ['RENEGADE', 'COMPASS', 'GRAND CHEROKEE', 'WRANGLER'],
        'GREAT WALL' => ['WINGLE 5', 'POER', 'HAVAL H6'],
        'CHANGAN' => ['CS35', 'ALSVIN', 'CS15'],
        'JAC' => ['S2', 'S3', 'T6', 'T8'],
        'DFSK' => ['GLORY 580', 'C31', 'K01'],
        'ISUZU' => ['D-MAX', 'MU-X', 'NPR', 'FRR'],
        'HINO' => ['300', '500', '700'],
        'VOLVO' => ['FH', 'FM', 'FMX'],
        'YAMAHA' => ['YBR 125', 'FZ', 'XTZ 150', 'NMAX', 'CRYPTON'],
        'BAJAJ' => ['BOXER', 'PULSAR', 'DOMINAR', 'DISCOVER', 'CT 100'],
        'KTM' => ['DUKE 200', 'DUKE 390', 'ADVENTURE 250'],
        'TVS' => ['APACHE', 'STAR', 'RAIDER'],
    ];

    public function run(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->command?->warn('VehiculoMarcaModeloSeeder: solo soportado en PostgreSQL (multi-schema).');

            return;
        }

        $schemas = Tenant::query()
            ->whereNotNull('schema_name')
            ->where('schema_name', '!=', '')
            ->pluck('schema_name');

        if ($schemas->isEmpty()) {
            $this->command?->warn('VehiculoMarcaModeloSeeder: no hay tenants; el catálogo se siembra al provisionar cada taller.');

            return;
        }

        foreach ($schemas as $schema) {
            $this->seedForSchema((string) $schema);
        }
    }

    /**
     * Siembra el catálogo base en el schema de UN tenant. Es idempotente
     * (usa `firstOrCreate`), así que se puede volver a correr sin duplicar.
     */
    public function seedForSchema(string $schema): void
    {
        if (! preg_match('/^[a-z_][a-z0-9_]{0,62}$/i', $schema)) {
            return;
        }

        $safe = str_replace('"', '', $schema);

        DB::statement('SET search_path TO "'.$safe.'", public');

        try {
            foreach (self::CATALOGO as $marcaNombre => $modelos) {
                $marca = Marca::withTrashed()->firstOrCreate(['nombre' => $marcaNombre]);

                if ($marca->trashed()) {
                    $marca->restore();
                }

                foreach ($modelos as $modeloNombre) {
                    $modelo = Modelo::withTrashed()->firstOrCreate([
                        'marca_id' => $marca->id,
                        'nombre' => $modeloNombre,
                    ]);

                    if ($modelo->trashed()) {
                        $modelo->restore();
                    }
                }
            }
        } finally {
            DB::statement('SET search_path TO public');
        }
    }
}
