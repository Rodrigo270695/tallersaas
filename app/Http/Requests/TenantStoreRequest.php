<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TenantStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('plataforma-tenants.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'tenant_slug' => ['required', 'string', 'min:3', 'max:60', 'regex:/^[a-z0-9\-]+$/', 'unique:tenants,slug'],
            'razon_social' => ['required', 'string', 'max:200'],
            'nombre_comercial' => ['nullable', 'string', 'max:200'],
            'ruc' => ['nullable', 'string', 'max:11'],
            'admin_email' => ['required', 'email', 'max:150'],
            'admin_password' => ['required', 'string', 'min:8', 'max:80'],
            'admin_nombres' => ['nullable', 'string', 'max:80'],
            'admin_apellidos' => ['nullable', 'string', 'max:80'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'plan_slug' => ['required', 'string', Rule::exists('plans', 'codigo')->where('activo', true)],
            'ciclo' => ['nullable', 'string', Rule::in(['mensual', 'anual'])],
        ];
    }

    public function attributes(): array
    {
        return [
            'tenant_slug' => 'subdominio',
            'razon_social' => 'razón social',
            'nombre_comercial' => 'nombre comercial',
            'ruc' => 'RUC',
            'admin_email' => 'correo del administrador',
            'admin_password' => 'contraseña del administrador',
            'plan_slug' => 'plan',
            'ciclo' => 'ciclo',
            'telefono' => 'teléfono',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'tenant_slug' => strtolower(trim((string) $this->input('tenant_slug', ''))),
            'razon_social' => trim((string) $this->input('razon_social', '')),
            'nombre_comercial' => filled($this->input('nombre_comercial'))
                ? trim((string) $this->input('nombre_comercial'))
                : null,
            'admin_email' => strtolower(trim((string) $this->input('admin_email', ''))),
        ]);
    }
}
