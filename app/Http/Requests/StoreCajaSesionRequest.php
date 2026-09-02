<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCajaSesionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('caja-sesiones.open') ?? false;
    }

    public function rules(): array
    {
        $tenantId = tenant_id();

        return [
            'sede_id' => [
                'required',
                'uuid',
                Rule::exists('sedes', 'id')->where(function ($query) use ($tenantId): void {
                    if ($tenantId !== null) {
                        $query->where('tenant_id', $tenantId)
                            ->where('activa', true)
                            ->whereNull('deleted_at');
                    }
                }),
            ],
            'moneda' => ['required', Rule::in(['PEN', 'USD'])],
            'saldo_apertura' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'notas' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'sede_id' => 'sede',
            'moneda' => 'moneda',
            'saldo_apertura' => 'saldo de apertura',
            'notas' => 'notas',
        ];
    }
}
