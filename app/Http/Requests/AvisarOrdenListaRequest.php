<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AvisarOrdenListaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ordenes-trabajo.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'telefono' => ['required', 'string', 'max:20'],
            'mensaje' => ['nullable', 'string', 'max:1500'],
            'guardar_en_cliente' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'telefono' => 'WhatsApp',
            'mensaje' => 'mensaje',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'guardar_en_cliente' => $this->boolean('guardar_en_cliente'),
            'mensaje' => filled($this->input('mensaje')) ? trim((string) $this->input('mensaje')) : null,
            'telefono' => filled($this->input('telefono')) ? trim((string) $this->input('telefono')) : null,
        ]);
    }
}
