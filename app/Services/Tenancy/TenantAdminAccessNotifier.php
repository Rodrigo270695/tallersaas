<?php

declare(strict_types=1);

namespace App\Services\Tenancy;

use App\Models\Tenant;
use App\Notifications\Tenancy\TenantAdminAccessRecoveredNotification;
use App\Support\Tenancy\TenantSubdomainUrl;
use Illuminate\Support\Facades\Notification;

/**
 * Avisa al cliente por correo tras recuperar acceso admin desde plataforma.
 */
final class TenantAdminAccessNotifier
{
    /**
     * @return array{email_sent: bool, whatsapp_sent: bool, warnings: list<string>}
     */
    public function notify(Tenant $tenant, string $adminEmail, ?string $bootstrapUrl): array
    {
        $warnings = [];
        $loginUrl = TenantSubdomainUrl::login($tenant);

        $emailSent = $this->sendEmail($tenant, $adminEmail, $loginUrl, $bootstrapUrl, $warnings);

        return [
            'email_sent' => $emailSent,
            'whatsapp_sent' => false,
            'warnings' => $warnings,
        ];
    }

    /**
     * @param  list<string>  $warnings
     */
    private function sendEmail(
        Tenant $tenant,
        string $adminEmail,
        string $loginUrl,
        ?string $bootstrapUrl,
        array &$warnings,
    ): bool {
        $email = strtolower(trim($adminEmail));
        if ($email === '') {
            $warnings[] = 'No se envió correo: no hay email de administrador.';

            return false;
        }

        try {
            Notification::sendNow(
                Notification::route('mail', $email),
                new TenantAdminAccessRecoveredNotification(
                    $tenant,
                    $email,
                    $loginUrl,
                    $bootstrapUrl,
                ),
            );
        } catch (\Throwable $e) {
            $warnings[] = app()->hasDebugModeEnabled()
                ? 'No se pudo enviar el correo: '.$e->getMessage()
                : 'No se pudo enviar el correo de acceso.';

            return false;
        }

        return true;
    }
}
