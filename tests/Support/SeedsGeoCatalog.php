<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\Departamento;
use App\Models\Distrito;
use App\Models\Pais;
use App\Models\Provincia;

trait SeedsGeoCatalog
{
    protected int $testDistritoId;

    protected function seedGeoCatalog(): void
    {
        $pais = Pais::query()->create([
            'name' => 'Perú',
            'status' => true,
        ]);

        $departamento = Departamento::query()->create([
            'pais_id' => $pais->id,
            'name' => 'LIMA',
            'status' => true,
        ]);

        $provincia = Provincia::query()->create([
            'departamento_id' => $departamento->id,
            'name' => 'LIMA',
            'status' => true,
        ]);

        $distrito = Distrito::query()->create([
            'provincia_id' => $provincia->id,
            'name' => 'LINCE',
            'status' => true,
        ]);

        $this->testDistritoId = (int) $distrito->id;
    }
}
