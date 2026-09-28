<?php

namespace App\Http\Requests;

use App\Rules\ExistsDistritoId;
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
            'tenant_slug' => ['required', 'string', 'min:3', 'max:60', 'regex:/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/', 'unique:tenants,slug'],
            'razon_social' => ['required', 'string', 'max:200'],
            'nombre_comercial' => ['nullable', 'string', 'max:200'],
            'ruc' => ['nullable', 'digits:11'],
            'admin_email' => ['required', 'email', 'max:150'],
            'admin_password' => ['required', 'string', 'min:8', 'max:80'],
            'admin_nombres' => ['nullable', 'string', 'max:80'],
            'admin_apellidos' => ['nullable', 'string', 'max:80'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'distrito_id' => ['nullable', 'integer', new ExistsDistritoId],
            'timezone' => ['nullable', 'string', 'max:64'],
            'locale' => ['nullable', 'string', 'max:10'],
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
            'direccion' => 'dirección',
            'distrito_id' => 'distrito',
            'timezone' => 'zona horaria',
            'locale' => 'idioma',
        ];
    }

    public function messages(): array
    {
        return [
            'tenant_slug.regex' => 'El subdominio solo admite minúsculas, números y guiones, y debe empezar con letra.',
            'ruc.digits' => 'El RUC debe tener 11 dígitos.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'tenant_slug' => $this->normalizeSlug((string) $this->input('tenant_slug', '')),
            'direccion' => filled($this->input('direccion')) ? trim((string) $this->input('direccion')) : null,
            'distrito_id' => filled($this->input('distrito_id')) ? (int) $this->input('distrito_id') : null,
            'timezone' => filled($this->input('timezone')) ? trim((string) $this->input('timezone')) : 'America/Lima',
            'locale' => filled($this->input('locale')) ? trim((string) $this->input('locale')) : 'es_PE',
            'ruc' => filled($this->input('ruc')) ? preg_replace('/\D/', '', (string) $this->input('ruc')) : null,
            'razon_social' => trim((string) $this->input('razon_social', '')),
            'nombre_comercial' => filled($this->input('nombre_comercial'))
                ? trim((string) $this->input('nombre_comercial'))
                : null,
            'admin_email' => strtolower(trim((string) $this->input('admin_email', ''))),
        ]);
    }

    private function normalizeSlug(string $slug): string
    {
        $slug = strtolower(trim($slug));
        $slug = preg_replace('/[^a-z0-9-]+/', '-', $slug) ?? '';
        $slug = preg_replace('/-+/', '-', $slug) ?? '';

        return trim($slug, '-');
    }
}
