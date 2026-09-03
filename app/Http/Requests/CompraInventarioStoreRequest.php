<?php

namespace App\Http\Requests;

use App\Models\Compra;
use App\Rules\ExistsSedeOfCurrentTenant;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompraInventarioStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proveedor_id' => [
                'nullable',
                'uuid',
                Rule::exists('proveedores', 'id')->whereNull('deleted_at'),
            ],
            'sede_id' => ['required', 'uuid', new ExistsSedeOfCurrentTenant],
            'tipo_comprobante' => ['required', 'string', Rule::in(Compra::TIPOS_COMPROBANTE)],
            'serie' => ['nullable', 'string', 'max:16'],
            'numero_documento' => ['nullable', 'string', 'max:64'],
            'fecha_documento' => ['required', 'date'],
            'notas' => ['nullable', 'string', 'max:20000'],
            'factura' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'lineas' => ['required', 'array', 'min:1'],
            'lineas.*.producto_id' => [
                'nullable',
                'uuid',
                Rule::exists('productos', 'id')->whereNull('deleted_at'),
            ],
            'lineas.*.nuevo_producto.nombre' => ['nullable', 'string', 'max:255'],
            'lineas.*.nuevo_producto.unidad' => ['nullable', 'string', 'max:20'],
            'lineas.*.cantidad' => ['required', 'numeric', 'min:0.001', 'max:99999999.999'],
            'lineas.*.costo_unitario' => ['nullable', 'numeric', 'min:0', 'max:99999999.9999'],
        ];
    }

    public function attributes(): array
    {
        return [
            'proveedor_id' => 'proveedor',
            'sede_id' => 'sede',
            'tipo_comprobante' => 'tipo de comprobante',
            'serie' => 'serie',
            'numero_documento' => 'número de documento',
            'fecha_documento' => 'fecha del documento',
            'factura' => 'comprobante',
            'lineas' => 'líneas',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $lineas = $this->input('lineas', []);
            if (! is_array($lineas)) {
                return;
            }

            foreach ($lineas as $i => $linea) {
                if (! is_array($linea)) {
                    continue;
                }

                $productoId = trim((string) ($linea['producto_id'] ?? ''));
                $nombreNuevo = trim((string) ($linea['nuevo_producto']['nombre'] ?? ''));

                if ($productoId === '' && $nombreNuevo === '') {
                    $validator->errors()->add(
                        "lineas.{$i}.producto_id",
                        'Selecciona un repuesto o indica el nombre del repuesto nuevo.',
                    );
                }
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $proveedor = trim((string) $this->input('proveedor_id', ''));

        $this->merge([
            'proveedor_id' => $proveedor === '' ? null : $proveedor,
            'serie' => $this->nullableTrim('serie', 16),
            'numero_documento' => $this->nullableTrim('numero_documento', 64),
            'notas' => $this->nullableText('notas'),
        ]);

        $lineas = $this->input('lineas', []);
        if (is_array($lineas)) {
            foreach ($lineas as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }

                $productoId = trim((string) ($row['producto_id'] ?? ''));
                $lineas[$i]['producto_id'] = $productoId === '' ? null : $productoId;

                $costo = $row['costo_unitario'] ?? null;
                $lineas[$i]['costo_unitario'] = ($costo === '' || $costo === null) ? null : $costo;

                $nuevo = $row['nuevo_producto'] ?? null;
                if (is_array($nuevo)) {
                    $nombre = trim((string) ($nuevo['nombre'] ?? ''));
                    $unidad = trim((string) ($nuevo['unidad'] ?? ''));
                    $lineas[$i]['nuevo_producto'] = $nombre === ''
                        ? null
                        : ['nombre' => $nombre, 'unidad' => $unidad === '' ? 'UN' : strtoupper($unidad)];
                }
            }
            $this->merge(['lineas' => $lineas]);
        }
    }

    private function nullableTrim(string $key, int $maxLen): ?string
    {
        $v = trim((string) $this->input($key, ''));

        return $v === '' ? null : mb_substr($v, 0, $maxLen);
    }

    private function nullableText(string $key): ?string
    {
        $v = trim((string) $this->input($key, ''));

        return $v === '' ? null : $v;
    }
}
