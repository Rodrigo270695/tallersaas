<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Models\User;
use App\Support\Tenancy\TallerAdminScope;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Validación unificada para crear y editar usuarios.
 *
 *   - `email` único por tenant (o panel central), ignorando soft-deleted.
 *   - `password` requerido al crear, opcional al editar.
 *   - `role` es un único nombre de rol (un usuario = un rol).
 *   - `created_by_id` lo establece el controller, nunca el cliente.
 */
class UserRequest extends FormRequest
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
        /** @var User|null $user */
        $user = $this->route('user');
        $userId = $user?->getKey();
        $isCreate = $userId === null;
        $tenantId = tenant_id();

        $emailUnique = Rule::unique('users', 'email')
            ->whereNull('deleted_at')
            ->ignore($userId);

        if ($tenantId !== null) {
            $emailUnique = $emailUnique->where('tenant_id', $tenantId);
        } else {
            $emailUnique = $emailUnique->whereNull('tenant_id');
        }

        $roleRule = Rule::exists(config('permission.table_names.roles'), 'name')
            ->where('guard_name', 'web');

        if (TallerAdminScope::isTallerContext()) {
            $roleRule = $roleRule
                ->where('tenant_id', tenant_id())
                ->whereNotIn('name', TallerAdminScope::hiddenRoleNames());
        } else {
            $roleRule = $roleRule->whereNull('tenant_id');
        }

        $passwordRules = [
            $isCreate ? 'required' : 'nullable',
            'string',
            'confirmed',
        ];

        if ($isCreate || filled($this->input('password'))) {
            $defaults = Password::defaults();
            $passwordRules[] = $defaults ?? 'min:8';
        }

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'string',
                'email',
                'max:150',
                $emailUnique,
            ],
            'phone' => ['nullable', 'string', 'max:32'],
            'password' => $passwordRules,
            'is_active' => ['required', 'boolean'],
            'role' => [
                'required',
                'string',
                $roleRule,
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nombre completo',
            'email' => 'correo electrónico',
            'phone' => 'teléfono',
            'password' => 'contraseña',
            'is_active' => 'estado',
            'role' => 'rol',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name', '')),
            'email' => strtolower(trim((string) $this->input('email', ''))),
            'phone' => trim((string) $this->input('phone', '')) ?: null,
            'is_active' => filter_var(
                $this->input('is_active', true),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            ) ?? true,
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if (! TallerAdminScope::isTallerContext()) {
                return;
            }

            $role = (string) $this->input('role', '');
            if (in_array($role, Role::platformOnlyRoleNames(), true)) {
                $v->errors()->add('role', __('validation.in', ['attribute' => 'rol']));
            }
        });
    }
}
