<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Support\Tenancy\TallerAdminScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    /**
     * @var list<int>
     */
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    /**
     * @var list<string>
     */
    private const SORTABLE_COLUMNS = [
        'name',
        'description',
        'permissions_count',
        'created_at',
    ];

    /**
     * @var list<string>
     */
    private const TIPO_OPTIONS = ['todos', 'sistema', 'personalizado'];

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $tipo = (string) $request->string('tipo', 'todos');
        if (! in_array($tipo, self::TIPO_OPTIONS, true)) {
            $tipo = 'todos';
        }

        $query = $this->buildBaseQuery($search, $tipo);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderBy('name');
        }

        $roles = $query
            ->withCount('permissions')
            ->with(['permissions:id,name'])
            ->paginate($perPage)
            ->withQueryString();

        $statsBase = TallerAdminScope::rolesQuery();

        return Inertia::render('configuracion/roles/index', [
            'roles' => $roles,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'tipo' => $tipo,
            ],
            'stats' => [
                'total' => (clone $statsBase)->count(),
                'sistema' => (clone $statsBase)->ofType('sistema')->count(),
                'personalizados' => (clone $statsBase)->ofType('personalizado')->count(),
                'coincidencias' => $roles->total(),
            ],
            'permissions_catalog' => $this->buildPermissionsCatalog($request),
            'mutations_locked' => is_public_demo_tenant(),
        ]);
    }

    public function store(RoleRequest $request): RedirectResponse
    {
        $this->abortIfDemoRolesLocked();

        Role::create([
            'name' => $request->validated('name'),
            'guard_name' => 'web',
            'description' => $request->validated('description'),
            'tenant_id' => tenant_id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rol creado correctamente.']);

        return back();
    }

    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        $this->abortIfDemoRolesLocked();
        TallerAdminScope::assertRoleAccessible($role);

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'name' => 'No se puede renombrar un rol protegido ('.$role->name.').',
            ]);
        }

        $role->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rol actualizado correctamente.']);

        return back();
    }

    public function updatePermissions(Request $request, Role $role): RedirectResponse
    {
        $this->abortIfDemoRolesLocked();
        TallerAdminScope::assertRoleAccessible($role);

        $assignable = TallerAdminScope::assignablePermissionNamesFor($request->user());

        $data = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => [
                'string',
                Rule::exists(config('permission.table_names.permissions'), 'name')
                    ->where('guard_name', 'web'),
                Rule::in($assignable),
            ],
        ]);

        $permissions = $data['permissions'] ?? [];
        if (TallerAdminScope::isTallerContext()) {
            $permissions = array_values(array_filter(
                $permissions,
                static fn (string $name): bool => TallerAdminScope::isTenantAssignablePermission($name),
            ));
        }

        if ($role->isBaseTallerRole() && $permissions === []) {
            throw ValidationException::withMessages([
                'permissions' => 'No puedes dejar sin permisos un rol base de taller ('.$role->name.').',
            ]);
        }

        if ($role->isPlatformRole() && $permissions === []) {
            throw ValidationException::withMessages([
                'permissions' => 'No puedes dejar sin permisos el rol de plataforma '.$role->name.'.',
            ]);
        }

        $role->syncPermissions($permissions);

        $count = count($permissions);
        $message = $count === 0
            ? 'Se removieron todos los permisos del rol.'
            : ($count === 1
                ? '1 permiso asignado al rol.'
                : "{$count} permisos asignados al rol.");

        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    public function destroy(Role $role): RedirectResponse
    {
        $this->abortIfDemoRolesLocked();
        TallerAdminScope::assertRoleAccessible($role);

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'name' => 'No se puede eliminar un rol protegido ('.$role->name.').',
            ]);
        }

        $role->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rol eliminado correctamente.']);

        return back();
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $this->abortIfDemoRolesLocked();

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer'],
        ]);

        $requestedIds = $data['ids'];

        $deletable = TallerAdminScope::rolesQuery()
            ->whereIn('id', $requestedIds)
            ->whereNotIn('name', Role::protectedRoleNames())
            ->get(['id', 'name']);

        $deletableIds = $deletable->pluck('id')->all();

        if ($deletableIds === []) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => 'No se eliminaron roles: la selección solo incluía roles del sistema.',
            ]);

            return back();
        }

        $count = Role::query()->whereIn('id', $deletableIds)->delete();
        $skipped = count($requestedIds) - $count;

        $message = $count === 1
            ? '1 rol eliminado correctamente.'
            : "{$count} roles eliminados correctamente.";

        if ($skipped > 0) {
            $message .= sprintf(' (%d rol%s del sistema se omitieron)', $skipped, $skipped === 1 ? '' : 'es');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    /**
     * @return Builder<Role>
     */
    private function buildBaseQuery(string $search, string $tipo): Builder
    {
        $query = TallerAdminScope::rolesQuery();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        $query->ofType($tipo);

        return $query;
    }

    /**
     * @return array<int, array{module: string, permissions: array<int, array{id: int, name: string, action: string}>}>
     */
    private function buildPermissionsCatalog(Request $request): array
    {
        $all = Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        if (TallerAdminScope::isTallerContext()) {
            $allowed = TallerAdminScope::assignablePermissionNamesFor($request->user());
            $all = $all->filter(
                static fn ($perm): bool => in_array($perm->name, $allowed, true),
            );
        }

        return TallerAdminScope::groupPermissionsCatalog($all);
    }

    /**
     * En el tenant público `demo` no se permiten alta/edición/borrado de
     * roles ni sync de permisos: los visitantes suelen romper admin_taller.
     */
    private function abortIfDemoRolesLocked(): void
    {
        if (! is_public_demo_tenant()) {
            return;
        }

        abort(403, 'En el taller demo no se pueden modificar roles ni permisos.');
    }
}
