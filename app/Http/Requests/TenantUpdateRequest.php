<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TenantUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('plataforma-tenants.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'razon_social' => ['required', 'string', 'max:200'],
            'nombre_comercial' => ['nullable', 'string', 'max:200'],
            'ruc' => ['nullable', 'string', 'max:11'],
            'email_admin' => ['required', 'email', 'max:150'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'direccion' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'razon_social' => 'razón social',
            'nombre_comercial' => 'nombre comercial',
            'ruc' => 'RUC',
            'email_admin' => 'correo del administrador',
            'telefono' => 'teléfono',
            'direccion' => 'dirección',
        ];
    }
}
