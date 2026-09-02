import { Head } from '@inertiajs/react';
import AuthStatus from '@/components/auth/auth-status';
import LoginFlipContent from '@/components/auth/login-flip-content';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Iniciar sesión" />

            {status && <AuthStatus variant="success">{status}</AuthStatus>}

            <LoginFlipContent canResetPassword={canResetPassword} />
        </>
    );
}

Login.layout = {
    title: 'tu taller te espera.',
    description: 'Ingresa con la cuenta de tu taller para gestionar órdenes, clientes y caja.',
};
