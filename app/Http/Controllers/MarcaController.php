<?php

namespace App\Http\Controllers;

use App\Http\Requests\MarcaRequest;
use App\Models\Marca;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * Alta rápida de marcas de vehículo desde el combobox creable del
 * formulario de "Nuevo vehículo" (ver `CreatableEntityCombobox`).
 */
class MarcaController extends Controller
{
    public function store(MarcaRequest $request): RedirectResponse
    {
        Marca::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Marca creada correctamente.']);

        return back();
    }
}
