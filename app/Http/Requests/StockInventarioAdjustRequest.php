<?php

namespace App\Http\Requests;

use App\Rules\ExistsSedeOfCurrentTenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockInventarioAdjustRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('stock.adjust') ?? false;
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
            'cantidad' => ['required', 'numeric', 'min:0', 'max:99999999.999'],
        ];
    }

    public function attributes(): array
    {
        return [
            'producto_id' => 'repuesto',
            'sede_id' => 'sede',
            'cantidad' => 'cantidad',
        ];
    }
}
