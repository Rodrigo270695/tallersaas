<?php

namespace App\Http\Requests;

use App\Models\OrdenTrabajo;
use App\Rules\ExistsSedeOfCurrentTenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrdenTrabajoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isCreate = $this->isMethod('post');

        return [
            'sede_id' => ['required', 'uuid', new ExistsSedeOfCurrentTenant],
            'cliente_id' => ['required', 'uuid', 'exists:clientes,id'],
            'vehiculo_id' => [
                'required',
                'uuid',
                Rule::exists('vehiculos', 'id')->where(fn ($query) => $query
                    ->where('cliente_id', $this->input('cliente_id'))
                    ->whereNull('deleted_at')),
            ],
            'estado' => [
                $isCreate ? 'nullable' : 'required',
                'string',
                Rule::in(OrdenTrabajo::ESTADOS),
            ],
            'prometida_at' => ['nullable', 'date'],
            'km_ingreso' => ['nullable', 'integer', 'min:0'],
            'km_salida' => ['nullable', 'integer', 'min:0'],
            'solicitud_cliente' => ['nullable', 'string', 'max:5000'],
            'diagnostico' => ['nullable', 'string', 'max:5000'],
            'notas_internas' => ['nullable', 'string', 'max:5000'],
            'anulado_motivo' => ['nullable', 'string', 'max:255'],
            'lineas' => ['nullable', 'array', 'max:50'],
            'lineas.*.servicio_id' => ['nullable', 'uuid', Rule::exists('servicios', 'id')->whereNull('deleted_at')],
            'lineas.*.producto_id' => ['nullable', 'uuid', Rule::exists('productos', 'id')->whereNull('deleted_at')],
            'lineas.*.descripcion' => ['nullable', 'string', 'max:500'],
            'lineas.*.cantidad' => ['nullable', 'numeric', 'min:0.001', 'max:99999'],
            'lineas.*.precio_unitario' => ['nullable', 'numeric', 'min:0', 'max:9999999.99'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $nullable = ['prometida_at', 'km_ingreso', 'km_salida', 'solicitud_cliente', 'diagnostico', 'notas_internas', 'anulado_motivo', 'estado'];

        $merged = [];
        foreach ($nullable as $field) {
            if ($this->exists($field) && $this->input($field) === '') {
                $merged[$field] = null;
            }
        }

        $lineas = $this->input('lineas');
        if (is_array($lineas)) {
            foreach ($lineas as $i => $linea) {
                if (! is_array($linea)) {
                    continue;
                }
                foreach (['servicio_id', 'producto_id', 'descripcion', 'cantidad', 'precio_unitario'] as $campo) {
                    if (array_key_exists($campo, $linea) && $linea[$campo] === '') {
                        $lineas[$i][$campo] = null;
                    }
                }
            }
            $merged['lineas'] = $lineas;
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    public function attributes(): array
    {
        return [
            'sede_id' => 'sede',
            'cliente_id' => 'cliente',
            'vehiculo_id' => 'vehículo',
            'estado' => 'estado',
            'prometida_at' => 'fecha prometida',
            'km_ingreso' => 'km de ingreso',
            'km_salida' => 'km de salida',
            'solicitud_cliente' => 'solicitud del cliente',
            'diagnostico' => 'diagnóstico',
            'notas_internas' => 'notas internas',
            'anulado_motivo' => 'motivo de anulación',
            'lineas' => 'líneas',
            'lineas.*.servicio_id' => 'servicio',
            'lineas.*.producto_id' => 'repuesto',
            'lineas.*.descripcion' => 'descripción',
            'lineas.*.cantidad' => 'cantidad',
            'lineas.*.precio_unitario' => 'precio unitario',
        ];
    }
}
