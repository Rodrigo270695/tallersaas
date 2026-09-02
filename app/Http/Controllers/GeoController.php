<?php

namespace App\Http\Controllers;

use App\Models\Departamento;
use App\Models\Distrito;
use App\Models\Provincia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints internos para el catálogo geográfico jerárquico.
 *
 * Diseño:
 *   - Solo lecturas. El catálogo no se edita desde la app (proviene
 *     del INEI y se siembra desde `tallersaas:geo-import`).
 *   - Respuesta minimalista (`id`, `name`) — los combobox solo necesitan eso.
 *   - Se filtran SIEMPRE por `status = true`.
 */
class GeoController extends Controller
{
    public function departamentos(): JsonResponse
    {
        $data = Departamento::query()
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($data);
    }

    public function provincias(Request $request): JsonResponse
    {
        $departamentoId = $request->integer('departamento_id');

        if ($departamentoId <= 0) {
            return response()->json([]);
        }

        $data = Provincia::query()
            ->where('departamento_id', $departamentoId)
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($data);
    }

    public function distritos(Request $request): JsonResponse
    {
        $provinciaId = $request->integer('provincia_id');

        if ($provinciaId <= 0) {
            return response()->json([]);
        }

        $data = Distrito::query()
            ->where('provincia_id', $provinciaId)
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($data);
    }
}
