<?php

namespace App\Http\Requests;

use App\Models\Producto;
use App\Models\UnidadMedida;
use App\Rules\ExistsSedeOfCurrentTenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductoInventarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Producto|null $producto */
        $producto = $this->route('producto');
        $productoId = $producto?->getKey();
        $isCreate = $this->isMethod('post');

        $rules = [
            'categoria_id' => [
                'nullable',
                'uuid',
                Rule::exists('categorias_productos', 'id')->whereNull('deleted_at'),
            ],
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'sku' => [
                'nullable',
                'string',
                'max:64',
                Rule::unique('productos', 'sku')->ignore($productoId),
            ],
            'codigo_barras' => ['nullable', 'string', 'max:64'],
            'unidad' => [
                'required',
                'string',
                'max:20',
                Rule::in($this->codigosUnidadPermitidos($producto)),
            ],
            'precio_venta' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'precio_compra' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'stock_minimo' => ['nullable', 'numeric', 'min:0', 'max:999999999.999'],
            'activo' => ['required', 'boolean'],
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'clear_foto' => ['nullable', 'boolean'],
        ];

        if ($isCreate) {
            $rules['stock_inicial_sede_id'] = [
                'nullable',
                'uuid',
                new ExistsSedeOfCurrentTenant,
                'required_with:stock_inicial_cantidad',
            ];
            $rules['stock_inicial_cantidad'] = ['nullable', 'numeric', 'min:0.001', 'max:999999999.999'];
        }

        return $rules;
    }

    public function attributes(): array
    {
        return [
            'categoria_id' => 'categoría',
            'nombre' => 'nombre',
            'sku' => 'SKU',
            'unidad' => 'unidad',
            'precio_venta' => 'precio de venta',
            'precio_compra' => 'precio de compra',
            'stock_minimo' => 'stock mínimo',
            'stock_inicial_sede_id' => 'sede de stock inicial',
            'stock_inicial_cantidad' => 'stock inicial',
            'foto' => 'foto',
        ];
    }

    public function messages(): array
    {
        return [
            'foto.max' => 'La foto no puede superar los 2 MB.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $sku = trim((string) $this->input('sku', ''));
        $barras = trim((string) $this->input('codigo_barras', ''));
        $unidad = strtoupper(trim((string) $this->input('unidad', '')));

        $this->merge([
            'sku' => $sku === '' ? null : $sku,
            'codigo_barras' => $barras === '' ? null : $barras,
            'unidad' => $unidad === '' ? 'UN' : $unidad,
            'activo' => $this->boolean('activo'),
            'categoria_id' => filled($this->input('categoria_id')) ? $this->input('categoria_id') : null,
            'descripcion' => filled($this->input('descripcion')) ? trim((string) $this->input('descripcion')) : null,
        ]);

        if ($this->has('clear_foto')) {
            $this->merge([
                'clear_foto' => filter_var($this->input('clear_foto'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }

        foreach (['precio_venta', 'precio_compra', 'stock_minimo', 'stock_inicial_cantidad'] as $campo) {
            if ($this->input($campo) === '') {
                $this->merge([$campo => null]);
            }
        }

        $stockSede = trim((string) $this->input('stock_inicial_sede_id', ''));
        $this->merge([
            'stock_inicial_sede_id' => $stockSede === '' ? null : $stockSede,
        ]);
    }

    /**
     * @return list<string>
     */
    private function codigosUnidadPermitidos(?Producto $producto): array
    {
        $codigos = UnidadMedida::codigosActivos();

        if ($codigos === []) {
            return Producto::UNIDADES;
        }

        if ($producto !== null && is_string($producto->unidad) && $producto->unidad !== '') {
            $codigos[] = $producto->unidad;
        }

        return array_values(array_unique($codigos));
    }
}
