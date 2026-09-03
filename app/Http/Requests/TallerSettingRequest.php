<?php

namespace App\Http\Requests;

use App\Rules\ExistsDistritoId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación de la configuración general del taller (singleton por schema).
 */
class TallerSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ruc' => ['nullable', 'string', 'size:11', 'regex:/^\d{11}$/'],
            'razon_social' => ['nullable', 'string', 'max:200'],
            'nombre_comercial' => ['nullable', 'string', 'max:150'],
            'direccion_fiscal' => ['nullable', 'string', 'max:255'],
            'distrito_id' => ['nullable', 'integer', new ExistsDistritoId],

            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'clear_logo' => ['nullable', 'boolean'],
            'color_primario' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'color_secundario' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],

            'email_institucional' => ['nullable', 'email', 'max:150'],
            'telefono_principal' => ['nullable', 'string', 'max:20'],
            'web_url' => ['nullable', 'url', 'max:200'],

            'moneda' => ['required', Rule::in(['PEN', 'USD'])],
            'igv_porcentaje' => ['required', 'numeric', 'min:0', 'max:100'],
            'igv_afectacion' => ['required', Rule::in(['gravado', 'exonerado', 'inafecto'])],
            'precio_incluye_igv' => ['nullable', 'boolean'],
            'ticket_ancho_mm' => ['nullable', 'integer', Rule::in([56, 58, 80])],
            'emite_comprobantes_sunat' => ['nullable', 'boolean'],
            'apisunat_token' => ['nullable', 'string', 'max:500'],
            'clear_apisunat_token' => ['nullable', 'boolean'],
            'apisunat_mode' => ['nullable', Rule::in(['sandbox', 'produccion'])],

            'notificar_cita_whatsapp_activo' => ['nullable', 'boolean'],
            'recordatorio_48h_activo' => ['nullable', 'boolean'],
            'recordatorio_2h_activo' => ['nullable', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'ruc' => 'RUC',
            'razon_social' => 'razón social',
            'nombre_comercial' => 'nombre comercial',
            'direccion_fiscal' => 'dirección fiscal',
            'distrito_id' => 'distrito',
            'logo' => 'logo',
            'color_primario' => 'color primario',
            'color_secundario' => 'color secundario',
            'email_institucional' => 'correo institucional',
            'telefono_principal' => 'teléfono',
            'web_url' => 'sitio web',
            'moneda' => 'moneda',
            'igv_porcentaje' => 'IGV',
            'igv_afectacion' => 'afectación IGV',
            'precio_incluye_igv' => 'precio incluye IGV',
            'ticket_ancho_mm' => 'ancho del ticket',
            'emite_comprobantes_sunat' => 'emitir comprobantes SUNAT',
            'apisunat_token' => 'token APISUNAT',
            'apisunat_mode' => 'ambiente APISUNAT',
        ];
    }

    protected function prepareForValidation(): void
    {
        $nullable = [
            'ruc',
            'razon_social',
            'nombre_comercial',
            'direccion_fiscal',
            'distrito_id',
            'color_primario',
            'color_secundario',
            'email_institucional',
            'telefono_principal',
            'web_url',
        ];

        $merged = [
            'clear_logo' => $this->boolean('clear_logo'),
            'precio_incluye_igv' => $this->boolean('precio_incluye_igv'),
            'emite_comprobantes_sunat' => $this->boolean('emite_comprobantes_sunat'),
            'clear_apisunat_token' => $this->boolean('clear_apisunat_token'),
            'notificar_cita_whatsapp_activo' => $this->boolean('notificar_cita_whatsapp_activo'),
            'recordatorio_48h_activo' => $this->boolean('recordatorio_48h_activo'),
            'recordatorio_2h_activo' => $this->boolean('recordatorio_2h_activo'),
        ];

        foreach ($nullable as $field) {
            if ($this->exists($field) && ($this->input($field) === '' || $this->input($field) === null)) {
                $merged[$field] = null;
            }
        }

        $this->merge($merged);
    }
}
