<?php

namespace App\Http\Requests;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación unificada para crear y editar roles.
 *
 * `name` es único por (`guard_name`, `tenant_id`). Los nombres protegidos
 * (roles de sistema) no se pueden reutilizar como roles personalizados.
 */
class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Role|null $role */
        $role = $this->route('role');
        $roleId = $role?->getKey();

        return [
            'name' => [
                'required',
                'string',
                'max:80',
                Rule::unique(config('permission.table_names.roles'), 'name')
                    ->where('guard_name', 'web')
                    ->where(fn ($q) => tenant_id() === null
                        ? $q->whereNull('tenant_id')
                        : $q->where('tenant_id', tenant_id()))
                    ->ignore($roleId),
                Rule::notIn(Role::protectedRoleNames()),
            ],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'description' => 'descripción',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name', '')),
        ]);
    }
}
