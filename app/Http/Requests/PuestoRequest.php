<?php

namespace App\Http\Requests;

use App\Rules\ExistsSedeOfCurrentTenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PuestoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $puestoId = $this->route('puesto')?->id;

        return [
            'sede_id' => ['required', 'uuid', new ExistsSedeOfCurrentTenant],
            'nombre' => [
                'required',
                'string',
                'max:60',
                Rule::unique('puestos', 'nombre')
                    ->where(fn ($query) => $query
                        ->where('sede_id', $this->input('sede_id'))
                        ->whereNull('deleted_at'))
                    ->ignore($puestoId),
            ],
            'activo' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'activo' => $this->boolean('activo'),
        ]);
    }

    public function attributes(): array
    {
        return [
            'sede_id' => 'sede',
            'nombre' => 'nombre',
        ];
    }
}
