<?php

namespace App\Http\Requests;

use App\Models\CajaEgreso;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCajaEgresoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('caja-sesiones.egreso') ?? false;
    }

    public function rules(): array
    {
        return [
            'monto' => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'motivo' => ['required', 'string', Rule::in(CajaEgreso::MOTIVOS)],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'monto' => 'monto del egreso',
            'motivo' => 'motivo',
            'descripcion' => 'descripción',
        ];
    }
}
