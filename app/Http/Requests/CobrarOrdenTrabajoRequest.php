<?php

namespace App\Http\Requests;

use App\Models\VentaPago;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CobrarOrdenTrabajoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ventas.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'caja_sesion_id' => ['nullable', 'uuid', 'exists:caja_sesiones,id'],
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
            'lineas' => 'líneas',
            'lineas.*.concepto' => 'concepto',
            'lineas.*.cantidad' => 'cantidad',
            'lineas.*.precio_unitario' => 'precio unitario',
            'lineas.*.producto_id' => 'repuesto',
            'lineas.*.servicio_id' => 'servicio',
            'pagos' => 'pagos',
            'pagos.*.metodo' => 'método de pago',
            'pagos.*.monto' => 'monto',
            'pagos.*.monto_recibido' => 'monto recibido',
            'notas' => 'notas',
            'tipo_comprobante_sunat' => 'tipo de comprobante',
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

            $productoId = trim((string) ($linea['producto_id'] ?? ''));
            $servicioId = trim((string) ($linea['servicio_id'] ?? ''));
            $lineas[$i]['producto_id'] = $productoId === '' ? null : $productoId;
            $lineas[$i]['servicio_id'] = $servicioId === '' ? null : $servicioId;
        }

        $this->merge(['lineas' => $lineas]);
    }
}
