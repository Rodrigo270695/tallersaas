<?php

namespace App\Http\Requests;

use App\Models\OrdenTrabajoChecklist;
use App\Models\OrdenTrabajoMecanico;
use App\Support\Taller\InspeccionChecklist;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrdenEquipoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && (
            $user->can('ordenes-trabajo.update') || $user->can('checklist-inspeccion.update')
        );
    }

    public function rules(): array
    {
        $tenantId = tenant_id();

        return [
            'puesto_id' => ['nullable', 'uuid', 'exists:puestos,id'],
            'mecanicos' => ['nullable', 'array'],
            'mecanicos.*.user_id' => [
                'required',
                'uuid',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('tenant_id', $tenantId)
                    ->where('is_active', true)),
            ],
            'mecanicos.*.rol' => ['required', 'string', Rule::in([
                OrdenTrabajoMecanico::ROL_RESPONSABLE,
                OrdenTrabajoMecanico::ROL_APOYO,
            ])],
            'checklist' => ['nullable', 'array'],
            'checklist.*.clave' => ['required', 'string', Rule::in(InspeccionChecklist::claves())],
            'checklist.*.estado' => ['required', 'string', Rule::in([
                OrdenTrabajoChecklist::ESTADO_OK,
                OrdenTrabajoChecklist::ESTADO_OBSERVACION,
                OrdenTrabajoChecklist::ESTADO_NA,
            ])],
            'checklist.*.nota' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('puesto_id') === '') {
            $this->merge(['puesto_id' => null]);
        }
    }
}
