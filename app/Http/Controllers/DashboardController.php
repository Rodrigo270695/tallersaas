<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Services\Dashboard\DashboardStatsService;
use App\Services\Onboarding\TallerOnboardingService;
use App\Tenancy\TenantManager;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DashboardController extends Controller
{
    public function __construct(
        private readonly TenantManager $tenants,
        private readonly DashboardStatsService $stats,
        private readonly TallerOnboardingService $onboarding,
    ) {}

    public function index(Request $request): Response
    {
        if (! $this->tenants->check()) {
            return Inertia::render('dashboard/central', [
                'stats' => [
                    'talleres_total' => Tenant::query()->count(),
                    'talleres_activos' => Tenant::query()
                        ->whereIn('estado', ['trial', 'active', 'grace'])
                        ->count(),
                ],
            ]);
        }

        /** @var User $user */
        $user = $request->user();

        $capabilities = [
            'citas' => $this->userCan($user, 'citas.view'),
            'ordenes' => $this->userCan($user, 'ordenes-trabajo.view'),
            'ventas' => $this->userCan($user, 'ventas.view'),
            'caja' => $this->userCan($user, 'caja-sesiones.view'),
            'citas_create' => $this->userCan($user, 'citas.create'),
            'ordenes_create' => $this->userCan($user, 'ordenes-trabajo.create'),
            'caja_open' => $this->userCan($user, 'caja-sesiones.open'),
        ];

        $context = $this->tenants->current();
        $tallerLabel = $context !== null
            ? (trim((string) ($context->nombreComercial() ?: '')) ?: $context->razonSocial())
            : 'Taller';
        $tenantModel = $context?->tenant;

        return Inertia::render('dashboard/index', [
            'taller_label' => $tallerLabel !== '' ? $tallerLabel : 'Taller',
            'capabilities' => $capabilities,
            'onboarding' => $tenantModel !== null
                ? $this->onboarding->snapshot($tenantModel, $user, $request)
                : null,
            ...$this->stats->build($user, $capabilities),
        ]);
    }

    private function userCan(User $user, string $ability): bool
    {
        try {
            return $user->can($ability);
        } catch (Throwable) {
            return false;
        }
    }
}
