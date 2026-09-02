<?php

use App\Http\Middleware\EnsureNoTenant;
use App\Http\Middleware\EnsureTenant;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\HandleTallerBrandTheme;
use App\Http\Middleware\MatchUserTenant;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SetPermissionsTeam;
use App\Http\Middleware\VerifyOrvaeProvisionSignature;
use App\Tenancy\Exceptions\TenantNotFoundException;
use App\Tenancy\Exceptions\TenantSuspendedException;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
        // `then` corre DESPUÉS de registrar las rutas estándar: aquí
        // enganchamos las rutas exclusivas de subdominios de tenant
        // (`routes/tenant.php`). El patrón `{tenant_subdomain}.<root>`
        // hace que Laravel solo enrute estas rutas cuando el host
        // coincide; las del dominio central nunca colisionan porque
        // jamás incluyen el subdominio en su matching.
        then: function (): void {
            Route::middleware('web')
                ->domain('{tenant_subdomain}.'.config('tenant.root_domain'))
                ->group(base_path('routes/tenant.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,

            // Multi-tenancy:
            //   - 'tenant'             resuelve el subdominio y fija search_path.
            //   - 'tenant.required'    aborta 404 si la ruta exige un tenant
            //                          y entró por dominio central.
            //   - 'tenant.none'        aborta 404 si la ruta es solo del panel
            //                          central y entró por subdominio de tenant.
            //   - 'tenant.match-user'  valida que el usuario autenticado pertenezca
            //                          al tenant del host (o sea central si no hay
            //                          tenant resuelto). Si no, cierra sesión y 403.
            'tenant' => ResolveTenant::class,
            'tenant.required' => EnsureTenant::class,
            'tenant.none' => EnsureNoTenant::class,
            'tenant.match-user' => MatchUserTenant::class,
            'tenant.permissions-team' => SetPermissionsTeam::class,
            'orvae.signature' => VerifyOrvaeProvisionSignature::class,
        ]);

        // `ResolveTenant` se aplica a TODO el grupo web. Es inocuo en el
        // dominio central (no toca nada) y obligatorio en subdominios para
        // que la BD use el schema correcto antes de que llegue cualquier
        // query. `SetPermissionsTeam` depende de que el tenant ya esté
        // resuelto, por eso va justo después.
        $middleware->web(prepend: [
            ResolveTenant::class,
            SetPermissionsTeam::class,
        ]);

        // Laravel reordena los middlewares en runtime según la lista de
        // prioridad. Si nuestros middlewares de tenancy no están ahí,
        // terminan ejecutándose DESPUÉS de `auth` y un request no
        // autenticado a una ruta central desde un subdominio recibiría
        // 302 → /login en vez del 404 esperado.
        $middleware->prependToPriorityList(before: AuthenticatesRequests::class, prepend: ResolveTenant::class);
        $middleware->prependToPriorityList(before: AuthenticatesRequests::class, prepend: EnsureNoTenant::class);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleTallerBrandTheme::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // El middleware `ResolveTenant` lanza esto cuando el subdominio no
        // corresponde a ningún tenant activo (typo, tenant borrado, etc.).
        $exceptions->renderable(function (TenantNotFoundException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'tenant_not_found',
                    'slug' => $e->identifier,
                ], 404);
            }

            abort(404, 'Taller no encontrado.');
        });

        // Tenant existe pero su suscripción no permite el acceso
        // (suspendido, cancelado o vencido fuera del periodo de gracia).
        $exceptions->renderable(function (TenantSuspendedException $e, Request $request) {
            if (Auth::guard('web')->check()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'tenant_suspended',
                    'block_type' => $e->blockType,
                    'estado' => $e->tenant->estado,
                ], 403);
            }

            abort(403, 'El acceso de este taller está suspendido. Contacta a soporte.');
        });
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('tallersaas:reminders-scan')->everyFifteenMinutes();
        $schedule->command('tallersaas:notifications-dispatch')->everyFiveMinutes();
        $schedule->command('tallersaas:whatsapp-sync-sessions')->everyFiveMinutes();
    })->create();
