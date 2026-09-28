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
                'max:120',
                Rule::unique('aseguradoras', 'nombre')
                    ->where(fn ($query) => $query->whereNull('deleted_at'))
                    ->ignore($aseguradoraId),
            ],
            'ruc' => ['nullable', 'string', 'max:20'],
            'telefono' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'activo' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nombre' => trim((string) $this->input('nombre', '')),
            'ruc' => $this->blankToNull('ruc'),
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
}
