<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LavadoCargosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('lavados.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'lineas' => ['required', 'array', 'min:1', 'max:50'],
            'lineas.*.servicio_id' => ['nullable', 'uuid', 'exists:servicios,id'],
            'lineas.*.descripcion' => ['required', 'string', 'max:500'],
            'lineas.*.cantidad' => ['required', 'numeric', 'min:0.001', 'max:99999'],
            'lineas.*.precio_unitario' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
        ];
    }

    public function attributes(): array
    {
        return [
            'lineas' => 'cargos',
            'lineas.*.descripcion' => 'descripción',
            'lineas.*.cantidad' => 'cantidad',
            'lineas.*.precio_unitario' => 'precio',
            'lineas.*.servicio_id' => 'servicio',
        ];
    }

    protected function prepareForValidation(): void
    {
        $lineas = $this->input('lineas');
        if (! is_array($lineas)) {
            return;
        }

        foreach ($lineas as $i => $linea) {
            if (! is_array($linea)) {
                continue;
            }

            $servicioId = trim((string) ($linea['servicio_id'] ?? ''));
            $lineas[$i]['servicio_id'] = $servicioId === '' ? null : $servicioId;
        }

        $this->merge(['lineas' => $lineas]);
    }
}
