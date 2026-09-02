<?php

declare(strict_types=1);

namespace App\Support\WhatsApp;

/**
 * Normaliza teléfonos peruanos al formato WhatsApp (dígitos con código de país).
 */
final class WhatsAppChatId
{
    public static function digits(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 9 && str_starts_with($digits, '9')) {
            $digits = '51'.$digits;
        }

        if (strlen($digits) === 11 && str_starts_with($digits, '51')) {
            return $digits;
        }

        if (strlen($digits) < 10 || strlen($digits) > 15) {
            return null;
        }

        return $digits;
    }

    public static function fromPhone(?string $phone): ?string
    {
        $digits = self::digits($phone);

        return $digits === null ? null : $digits.'@c.us';
    }

    public static function waMeUrl(string $digits, string $text): string
    {
        return 'https://wa.me/'.$digits.'?text='.rawurlencode($text);
    }
}
