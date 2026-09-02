<?php

namespace App\Support\Fel;

use App\Models\TallerSetting;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;
use Throwable;

final class ApisunatCredentialResolver
{
    /**
     * @return array{token: string, mode: 'sandbox'|'produccion'}
     */
    public static function fromTallerSetting(TallerSetting $setting): array
    {
        if (! self::estaConfigurado($setting)) {
            throw new RuntimeException('Configura el token de APISUNAT en Configuración general.');
        }

        try {
            $token = Crypt::decryptString((string) $setting->apisunat_token_enc);
        } catch (Throwable) {
            throw new RuntimeException('El token de APISUNAT está dañado. Vuelve a guardarlo.');
        }

        $mode = in_array($setting->apisunat_mode, ['sandbox', 'produccion'], true)
            ? $setting->apisunat_mode
            : 'sandbox';

        return [
            'token' => $token,
            'mode' => $mode,
        ];
    }

    public static function estaConfigurado(TallerSetting $setting): bool
    {
        return (bool) $setting->apisunat_configurado
            && filled($setting->apisunat_token_enc);
    }
}
