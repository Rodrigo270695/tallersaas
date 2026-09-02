import { Head } from '@inertiajs/react';
import ResetPasswordForm from '@/components/auth/reset-password-form';

type Props = {
    token: string;
    email: string;
};

export default function ResetPassword({ token, email }: Props) {
    return (
        <>
            <Head title="Restablecer contraseña" />

            <ResetPasswordForm token={token} email={email} />
        </>
    );
}

ResetPassword.layout = {
    title: 'crea tu nueva contraseña.',
    description: 'Elige una contraseña segura para volver a entrar a tu taller.',
};
