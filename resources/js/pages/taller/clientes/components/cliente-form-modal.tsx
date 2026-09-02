import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef  } from 'react';
import type {FormEvent} from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import clientes from '@/routes/taller/clientes';
import type { Cliente, ClienteTipoDocumento } from '../types';

export type ClienteFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Cliente a editar; si es `null` el modal se abre en modo crear. */
    cliente: Cliente | null;
};

type ClienteFormData = {
    nombres: string;
    apellidos: string;
    tipo_documento: ClienteTipoDocumento;
    numero_documento: string;
    telefono: string;
    email: string;
    direccion: string;
};

const emptyForm: ClienteFormData = {
    nombres: '',
    apellidos: '',
    tipo_documento: 'DNI',
    numero_documento: '',
    telefono: '',
    email: '',
    direccion: '',
};

const buildInitialData = (cliente: Cliente | null): ClienteFormData => ({
    nombres: cliente?.nombres ?? '',
    apellidos: cliente?.apellidos ?? '',
    tipo_documento: cliente?.tipo_documento ?? 'DNI',
    numero_documento: cliente?.numero_documento ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    direccion: cliente?.direccion ?? '',
});

const isFormValid = (data: ClienteFormData): boolean =>
    data.nombres.trim().length > 0;

const DOCUMENT_TYPES: { value: ClienteTipoDocumento; label: string }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carné de extranjería' },
    { value: 'PAS', label: 'Pasaporte' },
];

/**
 * Modal de crear/editar cliente.
 */
export function ClienteFormModal({
    open,
    onOpenChange,
    cliente,
}: ClienteFormModalProps) {
    const isEdit = cliente !== null;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<ClienteFormData>(emptyForm);

    const canSubmit = isFormValid(data) && !processing;
    const initialSnapshotRef = useRef<ClienteFormData>(emptyForm);

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(cliente);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof ClienteFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cliente?.id]);

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;

        return (Object.keys(initial) as Array<keyof ClienteFormData>).some(
            (key) => initial[key] !== data[key],
        );
    }, [data]);

    const confirmDiscard = (): boolean => {
        if (!isDirty) {
            return true;
        }

        return window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?');
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

        if (isEdit && cliente) {
            put(clientes.update(cliente.id).url, {
                preserveScroll: true,
                onSuccess,
            });

            return;
        }

        post(clientes.store().url, {
            preserveScroll: true,
            onSuccess,
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
            description={
                isEdit
                    ? 'Actualiza los datos de contacto de este cliente.'
                    : 'Registra un nuevo cliente del taller.'
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
                        {isEdit ? 'Guardar cambios' : 'Crear cliente'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title="Datos personales"
                    description="Nombre completo del cliente."
                    columns={2}
                >
                    <FormField
                        id="cliente-nombres"
                        label="Nombres"
                        required
                        error={errors.nombres}
                    >
                        <Input
                            id="cliente-nombres"
                            value={data.nombres}
                            onChange={(e) => setData('nombres', e.target.value)}
                            placeholder="Juan Carlos"
                            autoComplete="off"
                            autoFocus
                        />
                    </FormField>

                    <FormField
                        id="cliente-apellidos"
                        label="Apellidos"
                        error={errors.apellidos}
                    >
                        <Input
                            id="cliente-apellidos"
                            value={data.apellidos}
                            onChange={(e) => setData('apellidos', e.target.value)}
                            placeholder="Pérez García"
                            autoComplete="off"
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title="Documento de identidad"
                    columns={2}
                >
                    <FormField
                        id="cliente-tipo-documento"
                        label="Tipo de documento"
                        required
                        error={errors.tipo_documento}
                    >
                        <Select
                            value={data.tipo_documento}
                            onValueChange={(value) =>
                                setData('tipo_documento', value as ClienteTipoDocumento)
                            }
                        >
                            <SelectTrigger id="cliente-tipo-documento" className="w-full cursor-pointer">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DOCUMENT_TYPES.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="cursor-pointer"
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>

                    <FormField
                        id="cliente-numero-documento"
                        label="Número de documento"
                        error={errors.numero_documento}
                    >
                        <Input
                            id="cliente-numero-documento"
                            value={data.numero_documento}
                            onChange={(e) =>
                                setData('numero_documento', e.target.value)
                            }
                            placeholder="12345678"
                            autoComplete="off"
                        />
                    </FormField>
                </FormSection>

                <FormSection index={2} title="Contacto" columns={2}>
                    <FormField
                        id="cliente-telefono"
                        label="Teléfono"
                        error={errors.telefono}
                    >
                        <Input
                            id="cliente-telefono"
                            value={data.telefono}
                            onChange={(e) => setData('telefono', e.target.value)}
                            placeholder="987654321"
                            autoComplete="tel"
                        />
                    </FormField>

                    <FormField
                        id="cliente-email"
                        label="Correo"
                        error={errors.email}
                    >
                        <Input
                            id="cliente-email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="cliente@correo.com"
                            autoComplete="email"
                        />
                    </FormField>

                    <FormField
                        id="cliente-direccion"
                        label="Dirección"
                        error={errors.direccion}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="cliente-direccion"
                            value={data.direccion}
                            onChange={(e) => setData('direccion', e.target.value)}
                            placeholder="Av. Los Talleres 123"
                            autoComplete="street-address"
                        />
                    </FormField>
                </FormSection>
            </div>
        </FormModal>
    );
}
