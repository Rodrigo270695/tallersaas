<?php

namespace App\Http\Controllers;

use App\Models\Sede;
use App\Services\Reportes\ReporteFinancieroService;
use App\Support\Reportes\ReportePeriodo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReporteFinancieroController extends Controller
{
    public function index(Request $request, ReporteFinancieroService $reportes): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $periodo = ReportePeriodo::parse($request->string('periodo')->toString());
        $sedeId = trim((string) $request->string('sede_id', ''));
        if ($sedeId === '') {
            $sedeId = null;
        }

        return Inertia::render('reportes/financiero/index', [
            ...$reportes->build($periodo, $sedeId),
            'sedes' => Sede::query()
                ->where('tenant_id', $tenantId)
                ->where('activa', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'codigo']),
        ]);
    }
}
