import { Head } from '@inertiajs/react';
import ConfirmPasswordForm from '@/components/auth/confirm-password-form';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirmar contraseña" />

            <ConfirmPasswordForm />
        </>
    );
}

ConfirmPassword.layout = {
    title: 'confirma que eres tú.',
    description: 'Esta es un área segura. Confirma tu contraseña antes de continuar.',
};
