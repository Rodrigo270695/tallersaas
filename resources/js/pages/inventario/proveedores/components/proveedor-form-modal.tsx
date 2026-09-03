import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
    DocumentNumberLookupField,
    FormField,
    FormModal,
    FormSection,
    soloDigitosDocumento,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toastManager } from '@/lib/toast';
import proveedores from '@/routes/inventario/proveedores';
import type { Proveedor } from '../types';

type FormData = {
    ruc: string;
    razon_social: string;
    direccion: string;
    ubigeo_sunat: string;
    estado_sunat: string;
    condicion_sunat: string;
    telefono: string;
    email: string;
    notas: string;
    activo: boolean;
};

const emptyForm: FormData = {
    ruc: '',
    razon_social: '',
    direccion: '',
    ubigeo_sunat: '',
    estado_sunat: '',
    condicion_sunat: '',
    telefono: '',
    email: '',
    notas: '',
    activo: true,
};

const buildInitialData = (proveedor: Proveedor | null): FormData => ({
    ruc: proveedor?.ruc ?? '',
    razon_social: proveedor?.razon_social ?? '',
    direccion: proveedor?.direccion ?? '',
    ubigeo_sunat: proveedor?.ubigeo_sunat ?? '',
    estado_sunat: proveedor?.estado_sunat ?? '',
    condicion_sunat: proveedor?.condicion_sunat ?? '',
    telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '',
    notas: proveedor?.notas ?? '',
    activo: proveedor?.activo ?? true,
});

const isFormValid = (data: FormData): boolean =>
    data.ruc.trim().length === 11 && data.razon_social.trim().length > 0;

type ConsultaResponse = {
    success?: boolean;
    message?: string;
    code?: string;
    data?: {
        ruc?: string;
        razon_social?: string;
        direccion?: string | null;
        estado_sunat?: string | null;
        condicion_sunat?: string | null;
    };
};

export function ProveedorFormModal({
    open,
    onOpenChange,
    proveedor,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proveedor: Proveedor | null;
}) {
    const isEdit = proveedor !== null;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>(emptyForm);

    const canSubmit = isFormValid(data) && !processing;
    const lastConsultaKeyRef = useRef<string | null>(null);
    const [consultando, setConsultando] = useState(false);

    const rucLen = soloDigitosDocumento(data.ruc).length;
    const rucCompleto = rucLen === 11;

    useEffect(() => {
        if (!open) {
            return;
        }

        const initial = buildInitialData(proveedor);
        (Object.keys(initial) as Array<keyof FormData>).forEach((key) => {
            setData(key, initial[key]);
        });
        clearErrors();

        lastConsultaKeyRef.current = initial.ruc.length === 11 ? initial.ruc : null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, proveedor?.id]);

    const onConsultarRuc = async (forcedRuc?: string) => {
        const ruc = soloDigitosDocumento(forcedRuc ?? data.ruc, 11);

        if (ruc.length !== 11) {
            return;
        }

        lastConsultaKeyRef.current = ruc;
        setConsultando(true);

        try {
            const url = `${proveedores.consultaRuc.url()}?ruc=${encodeURIComponent(ruc)}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });

            const body = (await res.json()) as ConsultaResponse;

            if (!res.ok || !body.success || !body.data) {
                const title =
                    res.status === 429 || body.code === 'rate_limit'
                        ? 'Demasiadas consultas, intenta de nuevo en un momento.'
                        : (body.message ?? 'No se pudo consultar el RUC.');
                toastManager.error({ title });

                return;
            }

            const d = body.data;
            setData((prev) => ({
                ...prev,
                ruc: d.ruc ?? ruc,
                razon_social:
                    typeof d.razon_social === 'string' && d.razon_social !== ''
                        ? d.razon_social
                        : prev.razon_social,
                direccion:
                    prev.direccion.trim() !== ''
                        ? prev.direccion
                        : typeof d.direccion === 'string' && d.direccion !== ''
                          ? d.direccion
                          : prev.direccion,
                estado_sunat: typeof d.estado_sunat === 'string' ? d.estado_sunat : prev.estado_sunat,
                condicion_sunat:
                    typeof d.condicion_sunat === 'string' ? d.condicion_sunat : prev.condicion_sunat,
            }));
        } catch {
            toastManager.error({ title: 'No se pudo consultar el RUC.' });
        } finally {
            setConsultando(false);
        }
    };

    useEffect(() => {
        if (!open || !rucCompleto || consultando || processing) {
            return;
        }

        if (lastConsultaKeyRef.current === data.ruc) {
            return;
        }

        void onConsultarRuc(data.ruc);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, data.ruc, rucCompleto, consultando, processing]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        if (isEdit && proveedor) {
            put(proveedores.update(proveedor.id).url, { preserveScroll: true, onSuccess });

            return;
        }

        post(proveedores.store().url, { preserveScroll: true, onSuccess });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
            description="Al completar el RUC (11 dígitos) se consulta automáticamente SUNAT."
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar' : 'Crear'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection index={0} title="RUC" columns={1}>
                    <FormField id="prov-ruc" label="RUC" required error={errors.ruc}>
                        <DocumentNumberLookupField
                            id="prov-ruc"
                            value={data.ruc}
                            onChange={(next) => setData('ruc', next)}
                            maxLength={11}
                            consulting={consultando}
                            disabled={processing}
                            invalid={Boolean(errors.ruc)}
                            onConsult={() => void onConsultarRuc()}
                            consultAriaLabel="Consultar RUC en SUNAT"
                            placeholder="20123456789"
                        />
                    </FormField>
                </FormSection>

                <FormSection index={1} title="Datos del proveedor" columns={2}>
                    <FormField
                        id="prov-razon"
                        label="Razón social"
                        required
                        error={errors.razon_social}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="prov-razon"
                            value={data.razon_social}
                            onChange={(e) => setData('razon_social', e.target.value)}
                            placeholder="Distribuidora ABC S.A.C."
                            autoComplete="off"
                        />
                    </FormField>

                    <FormField id="prov-telefono" label="Teléfono" error={errors.telefono}>
                        <Input
                            id="prov-telefono"
                            value={data.telefono}
                            onChange={(e) => setData('telefono', e.target.value)}
                            placeholder="987654321"
                            autoComplete="tel"
                        />
                    </FormField>

                    <FormField id="prov-email" label="Correo" error={errors.email}>
                        <Input
                            id="prov-email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="proveedor@correo.com"
                            autoComplete="email"
                        />
                    </FormField>

                    <FormField
                        id="prov-direccion"
                        label="Dirección"
                        error={errors.direccion}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="prov-direccion"
                            value={data.direccion}
                            onChange={(e) => setData('direccion', e.target.value)}
                            placeholder="Av. Industrial 123"
                            autoComplete="street-address"
                        />
                    </FormField>

                    <FormField
                        id="prov-notas"
                        label="Notas"
                        error={errors.notas}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="prov-notas"
                            value={data.notas}
                            onChange={(e) => setData('notas', e.target.value)}
                            rows={2}
                        />
                    </FormField>

                    <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                        <Checkbox
                            checked={data.activo}
                            onCheckedChange={(checked) => setData('activo', checked === true)}
                        />
                        <span className="text-sm">Proveedor activo</span>
                    </label>
                </FormSection>
            </div>
        </FormModal>
    );
}
