<?php

namespace App\Http\Controllers;

use App\Http\Requests\ModeloRequest;
use App\Models\Modelo;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * Alta rápida de modelos de vehículo (en cascada bajo una marca) desde
 * el combobox creable del formulario de "Nuevo vehículo".
 */
class ModeloController extends Controller
{
    public function store(ModeloRequest $request): RedirectResponse
    {
        Modelo::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Modelo creado correctamente.']);

        return back();
    }
}
