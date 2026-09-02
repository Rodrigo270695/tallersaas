import { Form } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import AuthBackToLogin from '@/components/auth/auth-back-to-login';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FieldWithIcon } from '@/components/ui/field-with-icon';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { email } from '@/routes/password';

type ForgotPasswordFormProps = {
    /**
     * Si se pasa, el link "Volver a iniciar sesión" actúa como botón
     * que dispara este callback (para flip-card en vez de navegar).
     */
    onBackToLogin?: () => void;
};

/**
 * Solicita un correo para enviar el enlace de recuperación de contraseña.
 */
export default function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps = {}) {
    return (
        <>
            <Form {...email.form()} className="flex flex-col">
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <FieldWithIcon
                                id="email"
                                type="email"
                                name="email"
                                icon={Mail}
                                required
                                autoFocus
                                autoComplete="email"
                                placeholder="tucorreo@ejemplo.com"
                                className="h-11"
                                aria-invalid={!!errors.email}
                            />
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="h-11 w-full text-base font-medium"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            {processing ? 'Enviando…' : 'Enviar enlace de recuperación'}
                        </Button>
                    </div>
                )}
            </Form>
            <AuthBackToLogin onClick={onBackToLogin} />
        </>
    );
}
