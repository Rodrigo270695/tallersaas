<?php

namespace App\Http\Requests;

use App\Support\PlacaPeru;
use Illuminate\Foundation\Http\FormRequest;

class LavadoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sede_id' => ['required', 'uuid', 'exists:sedes,id'],
            'cliente_id' => ['required', 'uuid', 'exists:clientes,id'],
            'vehiculo_id' => ['nullable', 'uuid', 'exists:vehiculos,id'],
            'placa' => ['required', 'string', 'max:7', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! PlacaPeru::passes((string) $value, 'cualquiera')) {
                    $fail(PlacaPeru::message('cualquiera'));
                }
            }],
            'notas' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'sede_id' => 'sede',
            'cliente_id' => 'cliente',
            'vehiculo_id' => 'vehículo',
            'placa' => 'placa',
            'notas' => 'notas',
        ];
    }

    protected function prepareForValidation(): void
    {
        $vehiculoId = trim((string) $this->input('vehiculo_id', ''));
        $this->merge([
            'placa' => strtoupper(trim((string) $this->input('placa', ''))),
            'vehiculo_id' => $vehiculoId === '' ? null : $vehiculoId,
            'notas' => trim((string) $this->input('notas', '')) ?: null,
        ]);
    }
}
