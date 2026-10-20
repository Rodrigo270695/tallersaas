<?php

namespace App\Notifications\Tenancy;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Correo al admin del taller con el acceso recuperado por soporte SaaS.
 */
class TenantAdminAccessRecoveredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Tenant $tenant,
        public string $adminEmail,
        public string $loginUrl,
        public ?string $bootstrapUrl,
    ) {
        $this->onQueue('mails');
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $brand = $this->tenant->nombre_comercial ?: $this->tenant->razon_social;

        $mail = (new MailMessage)
            ->subject('Acceso de administrador TallerSaaS · '.$brand)
            ->greeting('¡Hola!')
            ->line('El equipo de TallerSaaS restableció el acceso de administrador de '.$brand.'.')
            ->line('Correo de ingreso: '.$this->adminEmail);

        if (is_string($this->bootstrapUrl) && $this->bootstrapUrl !== '') {
            $mail
                ->action('Definir o restablecer contraseña', $this->bootstrapUrl)
                ->line('El enlace de bienvenida es válido unas 48 horas. Si caduca, usa «Olvidé mi contraseña» en el inicio de sesión.');
        } else {
            $mail->action('Ir a mi taller', $this->loginUrl);
        }

        return $mail
            ->line('También puedes entrar desde: '.$this->loginUrl)
            ->salutation('— Equipo TallerSaaS');
    }
}
