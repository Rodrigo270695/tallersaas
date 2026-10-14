<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\PublicMarketing;

use App\Http\Controllers\Controller;
use App\Support\Marketing\PublicPlanCatalog;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/public/tallersaas/plans — planes públicos con features para la landing de Orvae.
 */
class PlansController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()
            ->json(PublicPlanCatalog::payload())
            ->header('Cache-Control', 'public, max-age=60');
    }
}
