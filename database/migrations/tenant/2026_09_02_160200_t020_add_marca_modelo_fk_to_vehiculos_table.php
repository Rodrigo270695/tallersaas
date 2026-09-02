<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Reemplaza las columnas de texto libre `marca`/`modelo` de `vehiculos`
 * por relaciones reales `marca_id`/`modelo_id` hacia las nuevas tablas
 * `marcas`/`modelos` (creadas en T018/T019), para poder ofrecer el
 * combobox en cascada (marca → modelo) en el formulario.
 *
 * Los valores de texto ya guardados se migran automáticamente: se crea
 * (o reutiliza) la marca/modelo correspondiente en mayúsculas y se
 * enlaza el vehículo antes de eliminar las columnas viejas.
 */
return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->foreignUuid('marca_id')->nullable()->after('placa')->constrained('marcas')->nullOnDelete();
                $table->foreignUuid('modelo_id')->nullable()->after('marca_id')->constrained('modelos')->nullOnDelete();
            });

            $this->backfillFromTextColumns();

            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->dropColumn(['marca', 'modelo']);
            });
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->string('marca', 60)->nullable();
                $table->string('modelo', 60)->nullable();
            });

            $this->restoreTextColumnsFromFk();

            Schema::table('vehiculos', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('modelo_id');
                $table->dropConstrainedForeignId('marca_id');
            });
        });
    }

    /**
     * Crea marcas/modelos a partir de los textos ya guardados en
     * `vehiculos.marca` / `vehiculos.modelo` y enlaza los FK nuevos.
     */
    private function backfillFromTextColumns(): void
    {
        $vehiculos = DB::table('vehiculos')
            ->select('id', 'marca', 'modelo')
            ->get();

        /** @var array<string, string> $marcaIdsPorNombre */
        $marcaIdsPorNombre = [];
        /** @var array<string, string> $modeloIdsPorClave */
        $modeloIdsPorClave = [];

        foreach ($vehiculos as $vehiculo) {
            $marcaNombre = mb_strtoupper(trim((string) $vehiculo->marca));
            $modeloNombre = mb_strtoupper(trim((string) $vehiculo->modelo));

            $marcaId = null;

            if ($marcaNombre !== '') {
                $marcaId = $marcaIdsPorNombre[$marcaNombre] ??= $this->firstOrCreateMarca($marcaNombre);
            }

            $modeloId = null;

            if ($marcaId !== null && $modeloNombre !== '') {
                $claveModelo = $marcaId.'|'.$modeloNombre;
                $modeloId = $modeloIdsPorClave[$claveModelo] ??= $this->firstOrCreateModelo($marcaId, $modeloNombre);
            }

            DB::table('vehiculos')
                ->where('id', $vehiculo->id)
                ->update(['marca_id' => $marcaId, 'modelo_id' => $modeloId]);
        }
    }

    private function firstOrCreateMarca(string $nombre): string
    {
        $existente = DB::table('marcas')->where('nombre', $nombre)->first(['id']);

        if ($existente !== null) {
            return $existente->id;
        }

        $id = (string) Str::uuid();

        DB::table('marcas')->insert([
            'id' => $id,
            'nombre' => $nombre,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function firstOrCreateModelo(string $marcaId, string $nombre): string
    {
        $existente = DB::table('modelos')
            ->where('marca_id', $marcaId)
            ->where('nombre', $nombre)
            ->first(['id']);

        if ($existente !== null) {
            return $existente->id;
        }

        $id = (string) Str::uuid();

        DB::table('modelos')->insert([
            'id' => $id,
            'marca_id' => $marcaId,
            'nombre' => $nombre,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    /**
     * Rollback: vuelca marca_id/modelo_id de vuelta a texto (best-effort).
     */
    private function restoreTextColumnsFromFk(): void
    {
        $vehiculos = DB::table('vehiculos')
            ->select('id', 'marca_id', 'modelo_id')
            ->get();

        foreach ($vehiculos as $vehiculo) {
            $marcaNombre = $vehiculo->marca_id !== null
                ? DB::table('marcas')->where('id', $vehiculo->marca_id)->value('nombre')
                : null;
            $modeloNombre = $vehiculo->modelo_id !== null
                ? DB::table('modelos')->where('id', $vehiculo->modelo_id)->value('nombre')
                : null;

            DB::table('vehiculos')
                ->where('id', $vehiculo->id)
                ->update(['marca' => $marcaNombre, 'modelo' => $modeloNombre]);
        }
    }
};
