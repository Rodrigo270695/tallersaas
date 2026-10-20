import { Form, Head, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import NewPasswordFields, {
    isNewPasswordReady,
} from '@/components/auth/new-password-fields';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { TenantShared } from '@/types/tenant';

export default function ChangePassword() {
    const page = usePage();
    const tenant = page.props.tenant as TenantShared | null;
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const brandName = tenant
        ? tenant.nombre_comercial || tenant.razon_social
        : (page.props.name as string);

    return (
        <>
            <Head title="Cambiar contraseña" />

            <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
                <ShieldCheck
                    aria-hidden="true"
                    strokeWidth={2.25}
                    className="mt-0.5 size-4 shrink-0"
                />
                <span className="text-pretty">
                    Por seguridad, define una nueva contraseña para{' '}
                    {brandName || 'tu taller'} antes de continuar.
                </span>
            </div>

            <Form
                action="/cuenta/cambiar-password"
                method="post"
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col"
                onSuccess={() => {
                    setPassword('');
                    setPasswordConfirmation('');
                }}
            >
                {({ processing, errors }) => {
                    const ready = isNewPasswordReady(
                        password,
                        passwordConfirmation,
                    );

                    return (
                        <div className="grid gap-6">
                            <NewPasswordFields
                                password={password}
                                passwordConfirmation={passwordConfirmation}
                                onPasswordChange={setPassword}
                                onPasswordConfirmationChange={
                                    setPasswordConfirmation
                                }
                                errors={errors}
                                passwordLabel="Nueva contraseña"
                                autoFocus
                            />

                            <Button
                                type="submit"
                                size="lg"
                                className="h-11 w-full text-base font-medium"
                                disabled={processing || !ready}
                                data-test="change-password-button"
                            >
                                {processing && <Spinner />}
                                {processing
                                    ? 'Guardando…'
                                    : 'Guardar y continuar'}
                            </Button>
                        </div>
                    );
                }}
            </Form>
        </>
    );
}

ChangePassword.layout = {
    title: 'protege tu cuenta.',
    description:
        'Por seguridad, define una nueva contraseña antes de continuar.',
};
