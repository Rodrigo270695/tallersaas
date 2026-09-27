<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscriptionUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('plataforma-suscripciones.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'plan_id' => ['required', 'uuid', Rule::exists('plans', 'id')],
            'estado' => ['required', 'string', Rule::in(['trial', 'active', 'grace', 'suspended', 'cancelled'])],
            'ciclo' => ['required', 'string', Rule::in(['mensual', 'trimestral', 'semestral', 'anual'])],
            'precio_pactado' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'descuento_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'trial_ends_at' => ['nullable', 'date'],
            'current_period_start' => ['nullable', 'date'],
            'current_period_end' => ['nullable', 'date'],
            'grace_ends_at' => ['nullable', 'date'],
            'proximo_cobro_at' => ['nullable', 'date'],
            'cancel_reason' => ['nullable', 'string', 'max:2000'],
            'cancel_feedback' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'plan_id' => 'plan',
            'estado' => 'estado',
            'ciclo' => 'ciclo',
            'precio_pactado' => 'precio pactado',
            'descuento_pct' => 'descuento',
            'trial_ends_at' => 'fin del periodo de prueba',
            'current_period_start' => 'inicio del periodo',
            'current_period_end' => 'fin del periodo',
            'grace_ends_at' => 'fin del periodo de gracia',
            'proximo_cobro_at' => 'próximo cobro',
            'cancel_reason' => 'motivo de cancelación',
            'cancel_feedback' => 'comentario de cancelación',
        ];
    }

    protected function prepareForValidation(): void
    {
        $nullable = [
            'trial_ends_at',
            'current_period_start',
            'current_period_end',
            'grace_ends_at',
            'proximo_cobro_at',
            'cancel_reason',
            'cancel_feedback',
        ];

        $merged = [];
        foreach ($nullable as $field) {
            $merged[$field] = filled($this->input($field)) ? $this->input($field) : null;
        }

        $this->merge($merged);
    }
}
