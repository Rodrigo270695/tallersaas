<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AseguradoraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $aseguradoraId = $this->route('aseguradora')?->id;

        return [
            'nombre' => [
                'required',
                'string',
                'max:255',
                Rule::unique('aseguradoras', 'nombre')
                    ->where(fn ($query) => $query->whereNull('deleted_at'))
                    ->ignore($aseguradoraId),
            ],
            'ruc' => [
                'nullable',
                'digits:11',
                Rule::unique('aseguradoras', 'ruc')
                    ->where(fn ($query) => $query->whereNull('deleted_at'))
                    ->ignore($aseguradoraId),
            ],
            'telefono' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'activo' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'ruc' => $this->blankToNullDigits('ruc'),
            'telefono' => $this->blankToNull('telefono'),
            'email' => $this->blankToNull('email'),
            'activo' => $this->boolean('activo'),
        ]);
    }

    private function blankToNull(string $key): ?string
    {
        $value = trim((string) $this->input($key, ''));

        return $value === '' ? null : $value;
    }

    private function blankToNullDigits(string $key): ?string
    {
        $value = preg_replace('/\D+/', '', (string) $this->input($key, '')) ?? '';

        return $value === '' ? null : $value;
    }

    public function attributes(): array
    {
        return [
            'nombre' => 'nombre',
            'ruc' => 'RUC',
            'telefono' => 'teléfono',
            'email' => 'correo',
        ];
    }

    public function messages(): array
    {
        return [
            'ruc.digits' => 'El RUC debe tener 11 dígitos.',
            'ruc.unique' => 'Ese RUC ya está registrado.',
        ];
    }
}
