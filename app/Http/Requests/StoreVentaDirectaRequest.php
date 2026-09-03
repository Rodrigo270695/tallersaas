<?php

namespace App\Http\Requests;

use App\Models\VentaPago;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVentaDirectaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ventas.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'caja_sesion_id' => ['nullable', 'uuid', 'exists:caja_sesiones,id'],
            'cliente_id' => ['nullable', 'uuid', 'exists:clientes,id'],
            'vehiculo_id' => [
                'nullable',
                'uuid',
                Rule::exists('vehiculos', 'id')->where(fn ($query) => $query
                    ->where('cliente_id', $this->input('cliente_id'))
                    ->whereNull('deleted_at')),
            ],
            'notas' => ['nullable', 'string', 'max:2000'],
            'tipo_comprobante_sunat' => ['nullable', 'integer', Rule::in([0, 1, 2])],
            'lineas' => ['required', 'array', 'min:1', 'max:50'],
            'lineas.*.concepto' => ['required', 'string', 'max:500'],
            'lineas.*.cantidad' => ['required', 'numeric', 'min:0.001', 'max:99999'],
            'lineas.*.precio_unitario' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'lineas.*.producto_id' => ['nullable', 'uuid', 'exists:productos,id'],
            'lineas.*.servicio_id' => ['nullable', 'uuid', 'exists:servicios,id'],
            'pagos' => ['required', 'array', 'min:1', 'max:6'],
            'pagos.*.metodo' => ['required', 'string', Rule::in(VentaPago::METODOS)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'pagos.*.monto_recibido' => ['nullable', 'numeric', 'min:0', 'max:9999999.99'],
        ];
    }

    public function attributes(): array
    {
        return [
            'caja_sesion_id' => 'sesión de caja',
            'cliente_id' => 'cliente',
            'vehiculo_id' => 'vehículo',
            'lineas' => 'líneas',
            'pagos' => 'pagos',
            'notas' => 'notas',
            'tipo_comprobante_sunat' => 'tipo de comprobante',
        ];
    }

    protected function prepareForValidation(): void
    {
        $nullable = ['cliente_id', 'vehiculo_id', 'caja_sesion_id', 'notas'];
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
                $productoId = trim((string) ($linea['producto_id'] ?? ''));
                $servicioId = trim((string) ($linea['servicio_id'] ?? ''));
                $lineas[$i]['producto_id'] = $productoId === '' ? null : $productoId;
                $lineas[$i]['servicio_id'] = $servicioId === '' ? null : $servicioId;
            }
            $merged['lineas'] = $lineas;
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }
}
