import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import roles from '@/routes/configuracion/roles';
import type { Role } from '../types';

export type RoleFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
};

type RoleFormData = {
    name: string;
    description: string;
};

const emptyForm: RoleFormData = {
    name: '',
    description: '',
};

const buildInitialData = (role: Role | null): RoleFormData => ({
    name: role?.name ?? '',
    description: role?.description ?? '',
});

const NAME_PATTERN = /^[a-z0-9_]{2,}$/;
const isFormValid = (data: RoleFormData): boolean =>
    NAME_PATTERN.test(data.name.trim());

export function RoleFormModal({
    open,
    onOpenChange,
    role,
}: RoleFormModalProps) {
    const isEdit = role !== null;
    const isSystem = role?.is_system === true;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<RoleFormData>(emptyForm);

    const canSubmit = isFormValid(data) && !processing && !isSystem;

    const initialSnapshotRef = useRef<RoleFormData>(emptyForm);

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(role);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof RoleFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, role?.id]);

    const confirmDiscard = (): boolean => {
        const initial = initialSnapshotRef.current;
        const dirty =
            initial.name !== data.name ||
            initial.description !== data.description;

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

        if (isEdit && role) {
            put(roles.update(role.id).url, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            post(roles.store().url, {
                preserveScroll: true,
                onSuccess,
            });
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? 'Editar rol' : 'Nuevo rol'}
            description={
                isEdit
                    ? 'Actualiza el nombre y la descripción del rol.'
                    : 'Define el nombre del nuevo rol.'
            }
            size="md"
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
                        {isEdit ? 'Guardar cambios' : 'Crear rol'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title="Información básica"
                    description={
                        isEdit
                            ? 'Edita los datos visibles del rol. Los permisos se gestionan desde el menú de acciones de la fila.'
                            : 'Identifica al rol con un nombre corto en minúsculas. Después podrás asignarle permisos desde el menú de acciones.'
                    }
                >
                    <FormField
                        id="role-name"
                        label="Nombre"
                        required
                        error={errors.name}
                        hint="Usa minúsculas, números y guiones bajos. Es el identificador interno."
                    >
                        <Input
                            id="role-name"
                            value={data.name}
                            onChange={(e) =>
                                setData(
                                    'name',
                                    e.target.value
                                        .toLowerCase()
                                        .replace(/\s+/g, '_'),
                                )
                            }
                            placeholder="Ej. mecanico_senior"
                            autoComplete="off"
                            autoFocus
                            disabled={isSystem}
                            className="font-mono"
                        />
                    </FormField>

                    <FormField
                        id="role-description"
                        label="Descripción"
                        error={errors.description}
                    >
                        <Textarea
                            id="role-description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            placeholder="Explica brevemente qué hace este rol"
                            disabled={isSystem}
                            rows={3}
                        />
                    </FormField>

                    {isEdit && (
                        <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            Para asignar o quitar permisos, abre el menú de
                            acciones de este rol y selecciona “Gestionar
                            permisos”.
                        </p>
                    )}
                </FormSection>
            </div>
        </FormModal>
    );
}
