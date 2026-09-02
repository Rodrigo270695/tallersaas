<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación unificada para crear y editar vehículos del taller.
 */
class VehiculoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $vehiculoId = $this->route('vehiculo')?->id;

        return [
            'cliente_id' => ['required', 'uuid', 'exists:clientes,id'],
            'placa' => [
                'required',
                'string',
                'max:10',
                Rule::unique('vehiculos', 'placa')
                    ->where(fn ($query) => $query->whereNull('deleted_at'))
                    ->ignore($vehiculoId),
            ],
            'marca' => ['nullable', 'string', 'max:60'],
            'modelo' => ['nullable', 'string', 'max:60'],
            'color' => ['nullable', 'string', 'max:40'],
            'anio' => ['nullable', 'integer', 'min:1950', 'max:'.(date('Y') + 1)],
            'kilometraje' => ['nullable', 'integer', 'min:0'],
            'vin' => ['nullable', 'string', 'max:30'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('placa')) {
            $this->merge(['placa' => mb_strtoupper((string) $this->input('placa'))]);
        }
    }

    public function attributes(): array
    {
        return [
            'cliente_id' => 'cliente',
            'placa' => 'placa',
            'marca' => 'marca',
            'modelo' => 'modelo',
            'color' => 'color',
            'anio' => 'año',
            'kilometraje' => 'kilometraje',
            'vin' => 'VIN',
        ];
    }
}
