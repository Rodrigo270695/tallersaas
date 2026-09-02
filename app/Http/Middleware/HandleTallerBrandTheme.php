<?php

namespace App\Http\Middleware;

use App\Models\TallerSetting;
use App\Support\Taller\TallerBrandTheme;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class HandleTallerBrandTheme
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        View::share('tallerBrandCss', $this->resolveCssBlock());

        return $next($request);
    }

    private function resolveCssBlock(): ?string
    {
        if (app(TenantManager::class)->current() === null) {
            return null;
        }

        try {
            $setting = TallerSetting::current();

            return TallerBrandTheme::rootCssBlock(
                $setting?->color_primario,
                $setting?->color_secundario,
            );
        } catch (Throwable) {
            return null;
        }
    }
}
