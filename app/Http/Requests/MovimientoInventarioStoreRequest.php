<?php

namespace App\Http\Requests;

use App\Models\MovimientoInventario;
use App\Rules\ExistsSedeOfCurrentTenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MovimientoInventarioStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('movimientos-stock.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'producto_id' => [
                'required',
                'uuid',
                Rule::exists('productos', 'id')->whereNull('deleted_at'),
            ],
            'sede_id' => ['required', 'uuid', new ExistsSedeOfCurrentTenant],
            'tipo' => ['required', 'string', Rule::in(MovimientoInventario::TIPOS_MANUALES)],
            'cantidad' => ['required', 'numeric', 'min:0.001', 'max:99999999.999'],
            'notas' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'producto_id' => 'repuesto',
            'sede_id' => 'sede',
            'tipo' => 'tipo',
            'cantidad' => 'cantidad',
            'notas' => 'notas',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('notas') && is_string($this->input('notas')) && trim((string) $this->input('notas')) === '') {
            $this->merge(['notas' => null]);
        }
    }
}
