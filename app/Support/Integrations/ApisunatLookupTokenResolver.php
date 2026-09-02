<?php

namespace App\Support\Integrations;

use App\Models\TallerSetting;
use App\Support\Fel\ApisunatCredentialResolver;
use Throwable;

/**
 * Token para consultas DNI/RUC de respaldo (APIs de apoyo APISUNAT).
 *
 * Prioridad: variable global en `.env` (`APISUNAT_LOOKUP_TOKEN`) → token
 * APISUNAT ya configurado en el taller para facturación electrónica.
 */
final class ApisunatLookupTokenResolver
{
    public static function resolve(): ?string
    {
        $global = trim((string) config('services.apisunat_lookup.token', ''));
        if ($global !== '') {
            return $global;
        }

        try {
            $setting = TallerSetting::current();

            if (! ApisunatCredentialResolver::estaConfigurado($setting)) {
                return null;
            }

            return ApisunatCredentialResolver::fromTallerSetting($setting)['token'];
        } catch (Throwable) {
            return null;
        }
    }
}
