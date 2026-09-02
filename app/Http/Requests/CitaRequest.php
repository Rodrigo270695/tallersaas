<?php

namespace App\Http\Requests;

use App\Models\Cita;
use App\Rules\ExistsSedeOfCurrentTenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CitaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isCreate = $this->isMethod('post');
        $tenantId = tenant_id();

        return [
            'sede_id' => ['required', 'uuid', new ExistsSedeOfCurrentTenant],
            'cliente_id' => ['required', 'uuid', 'exists:clientes,id'],
            'vehiculo_id' => [
                'required',
                'uuid',
                Rule::exists('vehiculos', 'id')->where(fn ($query) => $query
                    ->where('cliente_id', $this->input('cliente_id'))
                    ->whereNull('deleted_at')),
            ],
            'assigned_user_id' => [
                'nullable',
                'uuid',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->whereNull('deleted_at')),
            ],
            'inicia_at' => ['required', 'date'],
            'duracion_minutos' => ['required', 'integer', 'min:15', 'max:480'],
            'estado' => [
                $isCreate ? 'nullable' : 'required',
                'string',
                Rule::in(Cita::ESTADOS_EDITABLES),
            ],
            'motivo' => ['nullable', 'string', 'max:255'],
            'notas' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $nullable = ['assigned_user_id', 'motivo', 'notas', 'estado'];
        $merged = [];

        foreach ($nullable as $field) {
            if ($this->exists($field) && $this->input($field) === '') {
                $merged[$field] = null;
            }
        }

        if ($this->input('duracion_minutos') === '' || $this->input('duracion_minutos') === null) {
            $merged['duracion_minutos'] = 60;
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    public function attributes(): array
    {
        return [
            'sede_id' => 'sede',
            'cliente_id' => 'cliente',
            'vehiculo_id' => 'vehículo',
            'assigned_user_id' => 'mecánico',
            'inicia_at' => 'fecha y hora',
            'duracion_minutos' => 'duración',
            'estado' => 'estado',
            'motivo' => 'motivo',
            'notas' => 'notas',
        ];
    }
}
