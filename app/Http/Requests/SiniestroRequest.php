<?php

namespace App\Http\Requests;

use App\Models\Siniestro;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SiniestroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $siniestroId = $this->route('siniestro')?->id;

        return [
            'orden_trabajo_id' => [
                'required',
                'uuid',
                Rule::exists('ordenes_trabajo', 'id')->whereNull('deleted_at'),
                Rule::unique('siniestros', 'orden_trabajo_id')
                    ->where(fn ($query) => $query->whereNull('deleted_at'))
                    ->ignore($siniestroId),
            ],
            'aseguradora_id' => [
                'required',
                'uuid',
                Rule::exists('aseguradoras', 'id')->whereNull('deleted_at'),
            ],
            'numero' => ['required', 'string', 'max:40'],
            'estado' => ['required', Rule::in(Siniestro::ESTADOS)],
            'cobertura_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'monto_reclamado' => ['required', 'numeric', 'min:0'],
            'monto_seguro' => ['nullable', 'numeric', 'min:0'],
            'monto_cliente' => ['nullable', 'numeric', 'min:0'],
            'numero_poliza' => ['nullable', 'string', 'max:40'],
            'notas' => ['nullable', 'string', 'max:1000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'numero' => trim((string) $this->input('numero', '')),
            'numero_poliza' => $this->blankToNull('numero_poliza'),
            'notas' => $this->blankToNull('notas'),
            'cobertura_pct' => $this->blankToNull('cobertura_pct'),
            'monto_seguro' => $this->blankToNull('monto_seguro'),
            'monto_cliente' => $this->blankToNull('monto_cliente'),
        ]);
    }

    private function blankToNull(string $key): ?string
    {
        $value = trim((string) $this->input($key, ''));

        return $value === '' ? null : $value;
    }

    public function attributes(): array
    {
        return [
            'orden_trabajo_id' => 'orden de trabajo',
            'aseguradora_id' => 'aseguradora',
            'numero' => 'número de siniestro',
            'cobertura_pct' => 'cobertura',
            'monto_reclamado' => 'monto reclamado',
            'monto_seguro' => 'lo que paga el seguro',
            'monto_cliente' => 'lo que paga el cliente',
            'numero_poliza' => 'número de póliza',
        ];
    }
}
