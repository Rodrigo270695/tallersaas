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
            'trial_ends_at' => ['nullable', 'date_format:Y-m-d'],
            'current_period_end' => ['nullable', 'date_format:Y-m-d'],
            'grace_ends_at' => ['nullable', 'date_format:Y-m-d'],
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
            'precio_pactado' => 'precio',
            'trial_ends_at' => 'fin de prueba',
            'current_period_end' => 'periodo hasta',
            'grace_ends_at' => 'gracia hasta',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'trial_ends_at' => filled($this->input('trial_ends_at')) ? $this->input('trial_ends_at') : null,
            'current_period_end' => filled($this->input('current_period_end')) ? $this->input('current_period_end') : null,
            'grace_ends_at' => filled($this->input('grace_ends_at')) ? $this->input('grace_ends_at') : null,
        ]);
    }
}
