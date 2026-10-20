import { Form, Head } from '@inertiajs/react';
import { KeyRound, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    token: string | null;
    valid: boolean;
    workshop_name?: string | null;
    admin_email?: string | null;
    error?: string | null;
};

export default function BootstrapWelcome({
    token,
    valid,
    workshop_name,
    admin_email,
    error,
}: Props) {
    const workshop = workshop_name?.trim() || 'tu taller';

    return (
        <>
            <Head title="Activar acceso" />

            <div className="mb-6 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm">
                {valid ? (
                    <KeyRound
                        aria-hidden="true"
                        strokeWidth={2.25}
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    />
                ) : (
                    <ShieldAlert
                        aria-hidden="true"
                        strokeWidth={2.25}
                        className="mt-0.5 size-4 shrink-0 text-amber-600"
                    />
                )}
                <div className="text-pretty">
                    <p className="font-medium">
                        {valid ? 'Activa tu acceso' : 'Enlace no disponible'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                        {valid
                            ? `Bienvenido a ${workshop}. Confirma para elegir tu contraseña e ingresar.`
                            : (error ??
                              `No pudimos validar el enlace de ${workshop}.`)}
                    </p>
                    {valid && admin_email ? (
                        <p className="mt-2 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                            {admin_email}
                        </p>
                    ) : null}
                </div>
            </div>

            {valid && token ? (
                <Form
                    method="post"
                    action={`/auth/bienvenida/${encodeURIComponent(token)}`}
                    className="flex flex-col gap-4"
                >
                    {({ processing }) => (
                        <>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={processing}
                                className="h-11 w-full text-base font-medium"
                            >
                                {processing ? <Spinner /> : null}
                                Continuar y crear mi contraseña
                            </Button>
                            <p className="text-center text-xs text-muted-foreground">
                                Por seguridad el acceso solo se activa al
                                pulsar el botón (los previews de WhatsApp o
                                correo no lo consumen).
                            </p>
                        </>
                    )}
                </Form>
            ) : (
                <div className="flex flex-col gap-2">
                    <Button asChild size="lg" className="h-11 w-full">
                        <a href="/login">Ir al inicio de sesión</a>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="h-11 w-full">
                        <a href="/forgot-password">Olvidé mi contraseña</a>
                    </Button>
                </div>
            )}
        </>
    );
}

BootstrapWelcome.layout = {
    title: 'activa tu taller.',
    description:
        'Confirma el enlace de bienvenida para crear tu contraseña y empezar a trabajar.',
};
