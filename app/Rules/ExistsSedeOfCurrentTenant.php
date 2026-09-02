<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Sede;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Valida que la sede exista y pertenezca al tenant del request.
 */
final class ExistsSedeOfCurrentTenant implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $tenantId = tenant_id();

        if ($tenantId === null || $tenantId === '') {
            $fail(__('validation.exists', ['attribute' => $attribute]));

            return;
        }

        $exists = Sede::query()
            ->whereKey($value)
            ->where('tenant_id', $tenantId)
            ->exists();

        if (! $exists) {
            $fail(__('validation.exists', ['attribute' => $attribute]));
        }
    }
}
