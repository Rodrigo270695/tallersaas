import { useForm } from '@inertiajs/react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import usuarios from '@/routes/configuracion/usuarios';
import type { User, UserRoleOption } from '../types';

export type UserFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    rolesCatalog: readonly UserRoleOption[];
};

type UserFormData = {
    name: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation: string;
    is_active: boolean;
    role: string;
};

const emptyForm: UserFormData = {
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    is_active: true,
    role: '',
};

const buildInitialData = (user: User | null): UserFormData => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
    password_confirmation: '',
    is_active: user?.is_active ?? true,
    role: user?.roles[0]?.name ?? '',
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isFormValid = (data: UserFormData, isEdit: boolean): boolean => {
    if (data.name.trim().length < 2) {
        return false;
    }

    if (!EMAIL_REGEX.test(data.email.trim())) {
        return false;
    }

    if (!data.role) {
        return false;
    }

    if (!isEdit) {
        if (data.password.length < 8) {
            return false;
        }

        if (data.password !== data.password_confirmation) {
            return false;
        }
    } else if (data.password.length > 0) {
        if (data.password.length < 8) {
            return false;
        }

        if (data.password !== data.password_confirmation) {
            return false;
        }
    }

    return true;
};

export function UserFormModal({
    open,
    onOpenChange,
    user,
    rolesCatalog,
}: UserFormModalProps) {
    const isEdit = user !== null;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<UserFormData>(emptyForm);

    const canSubmit = isFormValid(data, isEdit) && !processing;

    const initialSnapshotRef = useRef<UserFormData>(emptyForm);

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(user);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof UserFormData>).forEach(
                (key) => {
                    setData(key, initial[key] as never);
                },
            );
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user?.id]);

    const confirmDiscard = (): boolean => {
        const initial = initialSnapshotRef.current;
        const dirty =
            initial.name !== data.name ||
            initial.email !== data.email ||
            initial.phone !== data.phone ||
            initial.is_active !== data.is_active ||
            initial.role !== data.role ||
            data.password.length > 0 ||
            data.password_confirmation.length > 0;

        if (!dirty) {
            return true;
        }

        return window.confirm(
            'Hay cambios sin guardar. ¿Descartarlos y cerrar?',
        );
    };

    const handleClose = (next: boolean) => {
        if (!next) {
            if (!confirmDiscard()) {
                return;
            }

            reset();
            clearErrors();
        }

        onOpenChange(next);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        if (isEdit && user) {
            put(usuarios.update(user.id).url, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            post(usuarios.store().url, {
                preserveScroll: true,
                onSuccess,
            });
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            description={
                isEdit
                    ? 'Actualiza los datos, el rol o el estado de la cuenta.'
                    : 'Crea una cuenta y asígnale un rol de este taller.'
            }
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isEdit ? 'Guardar cambios' : 'Crear usuario'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title="Datos de la cuenta"
                    description="Nombre, correo y teléfono de contacto."
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            id="user-name"
                            label="Nombre completo"
                            required
                            error={errors.name}
                        >
                            <Input
                                id="user-name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                placeholder="Juan Pérez"
                                autoComplete="off"
                                autoFocus
                            />
                        </FormField>

                        <FormField
                            id="user-email"
                            label="Correo electrónico"
                            required
                            error={errors.email}
                        >
                            <Input
                                id="user-email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                placeholder="juan@taller.com"
                                autoComplete="off"
                            />
                        </FormField>

                        <FormField
                            id="user-phone"
                            label="Teléfono"
                            error={errors.phone}
                        >
                            <Input
                                id="user-phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                placeholder="999888777"
                                autoComplete="off"
                            />
                        </FormField>

                        <FormField
                            id="user-is-active"
                            label="Estado"
                            hint="Puedes suspender la cuenta sin eliminarla."
                            error={errors.is_active}
                        >
                            <label
                                htmlFor="user-is-active"
                                className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <Checkbox
                                    id="user-is-active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) =>
                                        setData('is_active', checked === true)
                                    }
                                />
                                <span className="text-foreground/80">
                                    {data.is_active ? 'Activo' : 'Suspendido'}
                                </span>
                            </label>
                        </FormField>
                    </div>
                </FormSection>

                <FormSection
                    index={1}
                    title="Acceso"
                    description={
                        isEdit
                            ? 'Deja la contraseña vacía para conservarla. Elige un único rol.'
                            : 'Contraseña inicial y rol que define los permisos.'
                    }
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            id="user-role"
                            label="Rol"
                            required
                            error={errors.role}
                        >
                            <Select
                                value={data.role}
                                onValueChange={(value) =>
                                    setData('role', value)
                                }
                            >
                                <SelectTrigger id="user-role" className="w-full">
                                    <SelectValue placeholder="Selecciona un rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rolesCatalog.map((role) => (
                                        <SelectItem
                                            key={role.id}
                                            value={role.name}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck
                                                    className={
                                                        role.is_system
                                                            ? 'size-3.5 text-amber-600 dark:text-amber-400'
                                                            : 'size-3.5 text-primary/80'
                                                    }
                                                    strokeWidth={2.5}
                                                />
                                                <span className="font-mono text-xs">
                                                    {role.name}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <div className="hidden sm:block" />

                        <FormField
                            id="user-password"
                            label="Contraseña"
                            required={!isEdit}
                            error={errors.password}
                        >
                            <Input
                                id="user-password"
                                type="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                placeholder={
                                    isEdit
                                        ? 'Dejar vacío para no cambiarla'
                                        : 'Mínimo 8 caracteres'
                                }
                                autoComplete="new-password"
                            />
                        </FormField>

                        <FormField
                            id="user-password-confirmation"
                            label="Confirmar contraseña"
                            required={!isEdit && data.password.length > 0}
                        >
                            <Input
                                id="user-password-confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                placeholder={
                                    isEdit
                                        ? 'Dejar vacío para no cambiarla'
                                        : 'Repite la contraseña'
                                }
                                autoComplete="new-password"
                            />
                        </FormField>
                    </div>
                </FormSection>
            </div>
        </FormModal>
    );
}
