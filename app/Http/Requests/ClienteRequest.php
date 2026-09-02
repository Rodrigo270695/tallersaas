<?php

namespace App\Http\Requests;

use App\Models\Cliente;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación unificada para crear y editar clientes del taller.
 *
 * El número de documento exige dígitos exactos según el tipo (DNI: 8,
 * RUC: 11); CE/PAS quedan libres (pueden incluir letras) hasta 15
 * caracteres. Ver {@see Cliente::digitosRequeridos()}.
 */
class ClienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $clienteId = $this->route('cliente')?->id;
        $tipoDocumento = (string) $this->input('tipo_documento', '');
        $digitosRequeridos = Cliente::digitosRequeridos($tipoDocumento);

        $numeroDocumentoRules = ['string', 'max:15'];

        if ($digitosRequeridos !== null) {
            $numeroDocumentoRules[] = 'required';
            $numeroDocumentoRules[] = 'regex:/^\d{'.$digitosRequeridos.'}$/';
        } else {
            $numeroDocumentoRules[] = 'nullable';
        }

        $numeroDocumentoRules[] = Rule::unique('clientes', 'numero_documento')
            ->where(fn ($query) => $query
                ->where('tipo_documento', $tipoDocumento)
                ->whereNull('deleted_at'))
            ->ignore($clienteId);

        return [
            'nombres' => ['required', 'string', 'max:150'],
            'apellidos' => ['nullable', 'string', 'max:150'],
            'tipo_documento' => ['required', 'string', Rule::in(Cliente::TIPOS_DOCUMENTO)],
            'numero_documento' => $numeroDocumentoRules,
            'telefono' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'activo' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        $digitosRequeridos = Cliente::digitosRequeridos((string) $this->input('tipo_documento', ''));

        return [
            'numero_documento.required' => 'El número de documento es obligatorio para este tipo de documento.',
            'numero_documento.regex' => match ($digitosRequeridos) {
                8 => 'El DNI debe tener exactamente 8 dígitos.',
                11 => 'El RUC debe tener exactamente 11 dígitos.',
                default => 'El número de documento no tiene un formato válido.',
            },
        ];
    }

    public function attributes(): array
    {
        return [
            'nombres' => 'nombres',
            'apellidos' => 'apellidos',
            'tipo_documento' => 'tipo de documento',
            'numero_documento' => 'número de documento',
            'telefono' => 'teléfono',
            'email' => 'correo',
            'direccion' => 'dirección',
            'activo' => 'estado',
        ];
    }
}
