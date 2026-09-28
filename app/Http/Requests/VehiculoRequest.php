<?php

namespace App\Http\Requests;

use App\Models\Modelo;
use App\Support\PlacaPeru;
use Illuminate\Contracts\Validation\Validator;
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
                'max:7',
                Rule::unique('vehiculos', 'placa')
                    ->where(fn ($query) => $query->whereNull('deleted_at'))
                    ->ignore($vehiculoId),
            ],
            'tipo' => ['required', 'string', Rule::in(['auto', 'moto', 'mototaxi', 'camioneta', 'otro'])],
            'marca_id' => ['nullable', 'uuid', 'exists:marcas,id'],
            'modelo_id' => ['nullable', 'uuid', 'exists:modelos,id'],
            'color' => ['nullable', 'string', 'max:40'],
            'anio' => ['nullable', 'integer', 'min:1950', 'max:'.((int) date('Y') + 1)],
            'kilometraje' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'vin' => ['nullable', 'string', 'max:30', 'regex:/^[A-Z0-9]+$/'],
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'clear_foto' => ['nullable', 'boolean'],
            'activo' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Un modelo solo es válido si pertenece a la marca seleccionada.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $grupo = PlacaPeru::grupo((string) $this->input('tipo', 'auto'));
            $placa = (string) $this->input('placa', '');
            if ($placa !== '' && ! PlacaPeru::passes($placa, $grupo)) {
                $validator->errors()->add('placa', PlacaPeru::message($grupo));
            }

            $marcaId = $this->input('marca_id');
            $modeloId = $this->input('modelo_id');

            if (! is_string($modeloId) || $modeloId === '') {
                return;
            }

            $modelo = Modelo::query()->find($modeloId);

            if ($modelo !== null && $modelo->marca_id !== $marcaId) {
                $validator->errors()->add('modelo_id', 'El modelo seleccionado no pertenece a la marca elegida.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('placa')) {
            $this->merge(['placa' => mb_strtoupper((string) $this->input('placa'))]);
        }

        if ($this->filled('vin')) {
            $this->merge(['vin' => mb_strtoupper((string) $this->input('vin'))]);
        }

        foreach (['marca_id', 'modelo_id', 'anio', 'kilometraje', 'vin', 'color'] as $field) {
            if ($this->input($field) === '' || $this->input($field) === null) {
                $this->merge([$field => null]);
            }
        }

        if ($this->has('clear_foto')) {
            $this->merge([
                'clear_foto' => filter_var($this->input('clear_foto'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }

        if ($this->has('activo')) {
            $this->merge([
                'activo' => filter_var($this->input('activo'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    public function attributes(): array
    {
        return [
            'cliente_id' => 'cliente',
            'placa' => 'placa',
            'tipo' => 'tipo de vehículo',
            'marca_id' => 'marca',
            'modelo_id' => 'modelo',
            'color' => 'color',
            'anio' => 'año',
            'kilometraje' => 'kilometraje',
            'vin' => 'VIN',
            'foto' => 'foto',
        ];
    }

    public function messages(): array
    {
        return [
            'anio.integer' => 'El año debe ser un número.',
            'kilometraje.integer' => 'El kilometraje debe ser un número.',
            'vin.regex' => 'El VIN solo puede contener letras y números (sin espacios ni símbolos).',
            'foto.max' => 'La foto no puede superar los 2 MB.',
        ];
    }
}
