import { Head } from '@inertiajs/react';
import AuthStatus from '@/components/auth/auth-status';
import VerifyEmailForm from '@/components/auth/verify-email-form';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Verifica tu correo" />

            {status === 'verification-link-sent' && (
                <AuthStatus variant="info">
                    Te enviamos un nuevo enlace de verificación al correo que registraste.
                </AuthStatus>
            )}

            <VerifyEmailForm />
        </>
    );
}

VerifyEmail.layout = {
    title: 'verifica tu correo.',
    description: 'Confirma tu correo haciendo clic en el enlace que te acabamos de enviar.',
};
