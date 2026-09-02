import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    DocumentNumberLookupField,
    DocumentTypeSelect,
    FormField,
    FormModal,
    FormSection,
    soloDigitosDocumento,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toastManager } from '@/lib/toast';
import clientes from '@/routes/taller/clientes';
import type { Cliente, ClienteTipoDocumento } from '../types';

export type ClienteFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Cliente a editar; si es `null` el modal se abre en modo crear. */
    cliente: Cliente | null;
};

type ClienteFormData = {
    tipo_documento: ClienteTipoDocumento;
    numero_documento: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    email: string;
    direccion: string;
    activo: boolean;
};

const emptyForm: ClienteFormData = {
    tipo_documento: 'DNI',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true,
};

const buildInitialData = (cliente: Cliente | null): ClienteFormData => ({
    tipo_documento: cliente?.tipo_documento ?? 'DNI',
    numero_documento: cliente?.numero_documento ?? '',
    nombres: cliente?.nombres ?? '',
    apellidos: cliente?.apellidos ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    direccion: cliente?.direccion ?? '',
    activo: cliente?.activo ?? true,
});

const isFormValid = (data: ClienteFormData): boolean =>
    data.nombres.trim().length > 0;

const DOCUMENT_TYPES: { value: ClienteTipoDocumento; label: string }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carné de extranjería' },
    { value: 'PAS', label: 'Pasaporte' },
];

/** Longitud exacta de dígitos según el tipo de documento (null = libre). */
function digitosRequeridos(tipo: ClienteTipoDocumento): number | undefined {
    if (tipo === 'DNI') {
        return 8;
    }

    if (tipo === 'RUC') {
        return 11;
    }

    return undefined;
}

type ConsultaResponse = {
    success?: boolean;
    message?: string;
    code?: string;
    data?: {
        dni?: string;
        ruc?: string;
        nombres?: string;
        apellidos?: string;
        razon_social?: string;
        direccion?: string | null;
    };
};

/**
 * Modal de crear/editar cliente.
 *
 * El documento (tipo + número) va primero: al completar un DNI (8 dígitos)
 * o RUC (11 dígitos) se consulta automáticamente ApiPerú (con respaldo
 * APISUNAT) para autocompletar nombres/razón social.
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
    const lastConsultaKeyRef = useRef<string | null>(null);
    const [consultando, setConsultando] = useState(false);

    const docMaxLen = digitosRequeridos(data.tipo_documento);
    const isConsultable = docMaxLen !== undefined;
    const docLen = soloDigitosDocumento(data.numero_documento).length;
    const docCompleto = isConsultable && docLen === docMaxLen;
    const isRuc = data.tipo_documento === 'RUC';

    const consultaKeyFor = (
        tipo: ClienteTipoDocumento,
        numero: string,
        maxLen: number | undefined,
    ): string | null => {
        if (maxLen === undefined) {
            return null;
        }

        const digits = soloDigitosDocumento(numero, maxLen);

        return digits.length === maxLen ? `${tipo}:${digits}` : null;
    };

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(cliente);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof ClienteFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            clearErrors();

            // Evita auto-consulta al abrir un registro ya completo (edición).
            lastConsultaKeyRef.current = consultaKeyFor(
                initial.tipo_documento,
                initial.numero_documento,
                digitosRequeridos(initial.tipo_documento),
            );
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

    const handleTipoDocumentoChange = (value: string) => {
        const tipo = value as ClienteTipoDocumento;
        const max = digitosRequeridos(tipo);
        const numero = max !== undefined
            ? soloDigitosDocumento(data.numero_documento, max)
            : data.numero_documento;

        lastConsultaKeyRef.current = null;
        setData({ ...data, tipo_documento: tipo, numero_documento: numero });
    };

    const onConsultarDocumento = async (forcedNumero?: string) => {
        const numero = soloDigitosDocumento(forcedNumero ?? data.numero_documento, docMaxLen);

        if (!isConsultable || docMaxLen === undefined || numero.length !== docMaxLen) {
            return;
        }

        const key = `${data.tipo_documento}:${numero}`;
        lastConsultaKeyRef.current = key;
        setConsultando(true);

        try {
            const url = isRuc
                ? `${clientes.consultaRuc.url()}?ruc=${encodeURIComponent(numero)}`
                : `${clientes.consultaDni.url()}?dni=${encodeURIComponent(numero)}`;

            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            const body = (await res.json()) as ConsultaResponse;

            if (!res.ok || !body.success || !body.data) {
                const title =
                    res.status === 429 || body.code === 'rate_limit'
                        ? 'Demasiadas consultas, intenta de nuevo en un momento.'
                        : (body.message ?? 'No se pudo consultar el documento.');
                toastManager.error({ title });

                return;
            }

            const d = body.data;

            if (isRuc) {
                setData((prev) => ({
                    ...prev,
                    numero_documento: d.ruc ?? numero,
                    nombres: typeof d.razon_social === 'string' ? d.razon_social : prev.nombres,
                    apellidos: '',
                    direccion:
                        prev.direccion.trim() !== ''
                            ? prev.direccion
                            : typeof d.direccion === 'string' && d.direccion !== ''
                              ? d.direccion
                              : prev.direccion,
                }));
            } else {
                setData((prev) => ({
                    ...prev,
                    numero_documento: d.dni ?? numero,
                    nombres: typeof d.nombres === 'string' ? d.nombres : prev.nombres,
                    apellidos: typeof d.apellidos === 'string' ? d.apellidos : prev.apellidos,
                }));
            }
        } catch {
            toastManager.error({ title: 'No se pudo consultar el documento.' });
        } finally {
            setConsultando(false);
        }
    };

    useEffect(() => {
        if (!open || !isConsultable || !docCompleto || consultando || processing) {
            return;
        }

        const key = consultaKeyFor(data.tipo_documento, data.numero_documento, docMaxLen);

        if (!key || lastConsultaKeyRef.current === key) {
            return;
        }

        void onConsultarDocumento(soloDigitosDocumento(data.numero_documento, docMaxLen));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, data.numero_documento, data.tipo_documento, docCompleto, consultando, processing]);

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
                    title="Documento de identidad"
                    description="Al completar el DNI o RUC se consultan automáticamente los datos."
                    columns={2}
                >
                    <FormField
                        id="cliente-tipo-documento"
                        label="Tipo de documento"
                        required
                        error={errors.tipo_documento}
                    >
                        <DocumentTypeSelect
                            id="cliente-tipo-documento"
                            value={data.tipo_documento}
                            onValueChange={handleTipoDocumentoChange}
                            options={DOCUMENT_TYPES}
                            invalid={Boolean(errors.tipo_documento)}
                        />
                    </FormField>

                    <FormField
                        id="cliente-numero-documento"
                        label="Número de documento"
                        required={isConsultable}
                        error={errors.numero_documento}
                        hint={
                            isConsultable
                                ? undefined
                                : 'Puede incluir letras y números.'
                        }
                    >
                        <DocumentNumberLookupField
                            id="cliente-numero-documento"
                            value={data.numero_documento}
                            onChange={(next) => setData('numero_documento', next)}
                            maxLength={docMaxLen}
                            consulting={consultando}
                            disabled={processing}
                            invalid={Boolean(errors.numero_documento)}
                            onConsult={() => void onConsultarDocumento()}
                            consultAriaLabel={isRuc ? 'Consultar RUC en SUNAT' : 'Consultar DNI en RENIEC'}
                            placeholder={isRuc ? '20123456789' : isConsultable ? '12345678' : 'Documento'}
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title="Datos personales"
                    description={isRuc ? 'Razón social del cliente.' : 'Nombre completo del cliente.'}
                    columns={2}
                >
                    <FormField
                        id="cliente-nombres"
                        label={isRuc ? 'Razón social' : 'Nombres'}
                        required
                        error={errors.nombres}
                    >
                        <Input
                            id="cliente-nombres"
                            value={data.nombres}
                            onChange={(e) => setData('nombres', e.target.value)}
                            placeholder={isRuc ? 'Distribuidora ABC S.A.C.' : 'Juan Carlos'}
                            autoComplete="off"
                            autoFocus
                        />
                    </FormField>

                    {!isRuc && (
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
                    )}
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

                    <FormField
                        id="cliente-activo"
                        label="Cliente activo"
                        error={errors.activo}
                        hint="Desmarca esta opción si el cliente ya no debe considerarse vigente."
                    >
                        <div className="flex items-center gap-2 pt-1">
                            <Checkbox
                                id="cliente-activo"
                                checked={data.activo}
                                onCheckedChange={(checked) => setData('activo', checked === true)}
                            />
                        </div>
                    </FormField>
                </FormSection>
            </div>
        </FormModal>
    );
}
