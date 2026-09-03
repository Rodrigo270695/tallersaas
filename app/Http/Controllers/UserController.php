<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use App\Support\Tenancy\TallerAdminScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
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
        'email',
        'last_login_at',
        'created_at',
    ];

    /**
     * @var list<string>
     */
    private const ESTADO_OPTIONS = ['todos', 'activos', 'inactivos'];

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

        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, self::ESTADO_OPTIONS, true)) {
            $estado = 'todos';
        }

        $rol = trim((string) $request->string('rol', ''));

        $query = $this->buildBaseQuery($search, $estado, $rol);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $users = $query
            ->with([
                'roles:id,name',
                'createdBy:id,name',
            ])
            ->paginate($perPage)
            ->withQueryString();

        $rolesCatalog = TallerAdminScope::rolesQuery()
            ->orderBy('name')
            ->get(['id', 'name', 'description'])
            ->map(fn (Role $r) => [
                'id' => (int) $r->id,
                'name' => $r->name,
                'description' => $r->description,
                'is_system' => $r->is_system,
            ]);

        $statsBase = TallerAdminScope::usersQuery();

        return Inertia::render('configuracion/usuarios/index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'rol' => $rol !== '' ? $rol : null,
            ],
            'stats' => [
                'total' => (clone $statsBase)->count(),
                'activos' => (clone $statsBase)->where('is_active', true)->count(),
                'inactivos' => (clone $statsBase)->where('is_active', false)->count(),
                'coincidencias' => $users->total(),
            ],
            'roles_catalog' => $rolesCatalog,
            'mutations_locked' => is_public_demo_tenant(),
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $this->abortIfDemoUsersLocked();

        $data = $request->validated();

        $user = User::query()->create([
            'tenant_id' => tenant_id(),
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'is_active' => $data['is_active'],
            'created_by_id' => $request->user()?->id,
        ]);

        $user->syncRoles([$data['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario creado correctamente.']);

        return back();
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $this->abortIfDemoUsersLocked();

        TallerAdminScope::assertUserAccessible($user);

        if ($request->user()?->id === $user->id && $request->boolean('is_active') === false) {
            throw ValidationException::withMessages([
                'is_active' => 'No puedes suspender tu propia cuenta.',
            ]);
        }

        $data = $request->validated();

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'is_active' => $data['is_active'],
        ];

        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
        }

        $user->update($payload);
        $user->syncRoles([$data['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario actualizado correctamente.']);

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->abortIfDemoUsersLocked();

        TallerAdminScope::assertUserAccessible($user);

        if ($request->user()?->id === $user->id) {
            throw ValidationException::withMessages([
                'id' => 'No puedes eliminar tu propia cuenta.',
            ]);
        }

        if ($user->isPlatformSuperadmin()) {
            throw ValidationException::withMessages([
                'id' => 'No se puede eliminar un superadmin desde el panel.',
            ]);
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario eliminado correctamente.']);

        return back();
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $this->abortIfDemoUsersLocked();

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['uuid'],
        ]);

        $currentId = (string) ($request->user()?->id ?? '');

        $deletableIds = TallerAdminScope::usersQuery()
            ->whereIn('id', $data['ids'])
            ->whereKeyNot($currentId)
            ->pluck('id')
            ->all();

        if ($deletableIds === []) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => 'No se eliminaron usuarios: la selección solo incluía cuentas protegidas (superadmin o tu propia sesión).',
            ]);

            return back();
        }

        $count = User::query()->whereIn('id', $deletableIds)->delete();
        $skipped = count($data['ids']) - $count;

        $message = $count === 1
            ? '1 usuario eliminado correctamente.'
            : "{$count} usuarios eliminados correctamente.";

        if ($skipped > 0) {
            $message .= sprintf(
                ' (%d cuenta%s protegida%s se omitieron)',
                $skipped,
                $skipped === 1 ? '' : 's',
                $skipped === 1 ? '' : 's',
            );
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    /**
     * @return Builder<User>
     */
    private function buildBaseQuery(string $search, string $estado, string $rol): Builder
    {
        $query = TallerAdminScope::usersQuery();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%")
                    ->orWhere('phone', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado === 'activos') {
            $query->where('is_active', true);
        } elseif ($estado === 'inactivos') {
            $query->where('is_active', false);
        }

        if ($rol !== '') {
            $query->whereHas('roles', function ($q) use ($rol) {
                $q->where('name', $rol);
            });
        }

        return $query;
    }

    /**
     * En el tenant público `demo` no se permiten altas/edición/borrado de
     * usuarios: el admin de prueba debe permanecer intacto.
     */
    private function abortIfDemoUsersLocked(): void
    {
        if (! is_public_demo_tenant()) {
            return;
        }

        abort(403, 'En el taller demo no se pueden modificar usuarios.');
    }
}
