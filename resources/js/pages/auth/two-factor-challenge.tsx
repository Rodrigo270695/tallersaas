import { Head } from '@inertiajs/react';
import TwoFactorForm from '@/components/auth/two-factor-form';

export default function TwoFactorChallenge() {
    return (
        <>
            <Head title="Verificación en dos pasos" />

            <TwoFactorForm />
        </>
    );
}

TwoFactorChallenge.layout = {
    title: 'Verifica tu identidad',
    description: 'Ingresa el código de 6 dígitos que muestra tu app de autenticación.',
};
