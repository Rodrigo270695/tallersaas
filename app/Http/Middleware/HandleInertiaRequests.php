<?php

namespace App\Http\Middleware;

use App\Models\TallerSetting;
use App\Models\User;
use App\Support\Taller\TallerBrandingUrls;
use App\Tenancy\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;
use Throwable;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $tenantContext = app(TenantManager::class)->current();
        $tenant = $tenantContext?->tenant;

        /** @var User|null $user */
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'permissions' => $this->resolveUserPermissions($user),
                'roles' => $this->resolveUserRoles($user),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // Snapshot del tenant activo (null en el dominio central del
            // superadmin). Lo consumen los layouts de auth y `AppLogo`
            // para mostrar el nombre/saludo del taller en vez de "TallerSaaS".
            'tenant' => $tenant === null ? null : [
                'id' => (string) $tenant->getKey(),
                'slug' => $tenant->slug,
                'razon_social' => $tenant->razon_social,
                'nombre_comercial' => $tenant->nombre_comercial,
                'estado' => $tenant->estado,
            ],
            // Branding (logo + colores) configurado por el propio taller en
            // `cfg_taller_settings`. Con esto el login y el resto de la app
            // se pintan con la identidad de CADA taller, no con el naranja
            // por defecto de TallerSaaS.
            'taller_branding' => $tenantContext === null ? null : $this->resolveTallerBranding(),
            'tenant_impersonation' => $this->resolveImpersonation($request),
        ];
    }

    /**
     * @return array{tenant_id: string, tenant_label: string, started_at: string}|null
     */
    private function resolveImpersonation(Request $request): ?array
    {
        $imp = $request->session()->get('tenant_impersonation');
        if (! is_array($imp) || empty($imp['tenant_id'])) {
            return null;
        }

        return [
            'tenant_id' => (string) $imp['tenant_id'],
            'tenant_label' => (string) ($imp['tenant_label'] ?? ''),
            'started_at' => (string) ($imp['started_at'] ?? ''),
        ];
    }

    /**
     * @return list<string>
     */
    private function resolveUserPermissions(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        try {
            if ($user->isPlatformSuperadmin()) {
                $previousTeam = getPermissionsTeamId();
                setPermissionsTeamId(null);

                try {
                    $user->unsetRelation('roles');
                    $user->unsetRelation('permissions');

                    return $user->getAllPermissions()->pluck('name')->values()->all();
                } finally {
                    setPermissionsTeamId($previousTeam);
                    $user->unsetRelation('roles');
                    $user->unsetRelation('permissions');
                }
            }

            return $user->getAllPermissions()->pluck('name')->values()->all();
        } catch (Throwable $e) {
            report($e);
            Log::error('No se pudieron cargar permisos Inertia.', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * @return list<string>
     */
    private function resolveUserRoles(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        try {
            if ($user->isPlatformSuperadmin()) {
                return ['superadmin'];
            }

            return $user->getRoleNames()->values()->all();
        } catch (Throwable $e) {
            report($e);
            Log::error('No se pudieron cargar roles Inertia.', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * @return array{logo_url: string, updated_at: string|null, color_primario: string|null, color_secundario: string|null}
     */
    private function resolveTallerBranding(): array
    {
        try {
            return TallerBrandingUrls::sharedPayload(TallerSetting::current());
        } catch (Throwable $e) {
            report($e);

            return [
                'logo_url' => TallerBrandingUrls::default(),
                'updated_at' => null,
                'color_primario' => null,
                'color_secundario' => null,
            ];
        }
    }
}
