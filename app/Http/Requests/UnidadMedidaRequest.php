<?php

namespace App\Http\Requests;

use App\Models\UnidadMedida;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnidadMedidaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var UnidadMedida|null $unidad */
        $unidad = $this->route('unidadMedida');
        $unidadId = $unidad?->getKey();

        return [
            'codigo' => [
                'required',
                'string',
                'min:1',
                'max:20',
                'regex:/^[A-Z0-9][A-Z0-9_-]*$/',
                Rule::unique('unidades_medida', 'codigo')->ignore($unidadId),
            ],
            'nombre' => ['required', 'string', 'max:80'],
            'orden' => ['nullable', 'integer', 'min:0', 'max:99999'],
            'activo' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'codigo' => 'código',
            'nombre' => 'nombre',
            'orden' => 'orden',
            'activo' => 'activo',
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.regex' => 'El código solo admite mayúsculas, números, guión y guión bajo.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $codigo = strtoupper(trim((string) $this->input('codigo', '')));
        $nombre = trim((string) $this->input('nombre', ''));

        $this->merge([
            'codigo' => $codigo === '' ? null : $codigo,
            'nombre' => $nombre === '' ? null : $nombre,
            'activo' => $this->boolean('activo'),
            'orden' => $this->input('orden') === '' || $this->input('orden') === null
                ? 0
                : (int) $this->input('orden'),
        ]);
    }
}
