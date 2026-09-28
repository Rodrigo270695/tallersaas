import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { PlanMark, planColor } from '@/components/tenant-plan-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';
import planes from '@/routes/plataforma/planes';
import type { Plan } from '../types';

type FormData = {
    codigo: string;
    nombre: string;
    descripcion: string;
    badge: string;
    color_hex: string;
    precio_mensual: string;
    precio_anual: string;
    trial_days: string;
    es_publico: boolean;
    activo: boolean;
};

const emptyForm: FormData = {
    codigo: '',
    nombre: '',
    descripcion: '',
    badge: '',
    color_hex: '#1e3a5f',
    precio_mensual: '0.00',
    precio_anual: '',
    trial_days: '14',
    es_publico: true,
    activo: true,
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function initialData(plan: Plan | null): FormData {
    if (!plan) {
        return emptyForm;
    }

    return {
        codigo: plan.codigo,
        nombre: plan.nombre,
        descripcion: plan.descripcion ?? '',
        badge: plan.badge ?? '',
        color_hex: plan.color_hex ?? '#1e3a5f',
        precio_mensual: String(plan.precio_mensual),
        precio_anual: plan.precio_anual ? String(plan.precio_anual) : '',
        trial_days: String(plan.trial_days),
        es_publico: plan.es_publico,
        activo: plan.activo,
    };
}

export function PlanFormModal({
    open,
    onOpenChange,
    plan,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: Plan | null;
}) {
    const isEdit = plan !== null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>(emptyForm);
    const { remember, requestClose } = useUnsavedFormGuard(data, onOpenChange);
    const pickerColor = HEX.test(data.color_hex) ? data.color_hex : '#1e3a5f';
    const previewColor = planColor(data.codigo || 'pro', HEX.test(data.color_hex) ? data.color_hex : null);

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        const initial = initialData(plan);
        remember(initial);

        if (!plan) {
            reset();
        }

        setData(initial);
    }, [open, plan, clearErrors, reset, setData, remember]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit && plan) {
            put(planes.update(plan.id).url, options);

            return;
        }

        post(planes.store().url, options);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={requestClose}
            size="lg"
            title={isEdit ? 'Editar plan' : 'Nuevo plan'}
            description="Código, nombre comercial, badge y color. El color que elijas se ve en el sidebar del taller."
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => requestClose(false)}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar cambios' : 'Crear plan'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title="Identidad"
                    description="Código interno, nombre comercial y elementos visuales."
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            id="p-codigo"
                            label="Código"
                            required
                            hint="Solo minúsculas, dígitos y guion bajo. No se puede cambiar después."
                            error={errors.codigo}
                        >
                            <Input
                                id="p-codigo"
                                value={data.codigo}
                                disabled={isEdit}
                                autoComplete="off"
                                className="font-mono"
                                placeholder="experto"
                                onChange={(e) =>
                                    setData(
                                        'codigo',
                                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                                    )
                                }
                            />
                        </FormField>
                        <FormField id="p-nombre" label="Nombre comercial" required error={errors.nombre}>
                            <Input
                                id="p-nombre"
                                value={data.nombre}
                                autoComplete="off"
                                placeholder="Experto"
                                onChange={(e) => setData('nombre', e.target.value)}
                            />
                        </FormField>
                        <FormField
                            id="p-desc"
                            label="Descripción"
                            hint="Texto que se muestra en Mi suscripción."
                            error={errors.descripcion}
                            className="sm:col-span-2"
                        >
                            <Textarea
                                id="p-desc"
                                value={data.descripcion}
                                rows={3}
                                placeholder="Ideal para talleres con varias sedes…"
                                onChange={(e) => setData('descripcion', e.target.value)}
                            />
                        </FormField>
                        <FormField
                            id="p-badge"
                            label="Badge"
                            hint="Mini etiqueta, por ejemplo «Más vendido»."
                            error={errors.badge}
                        >
                            <Input
                                id="p-badge"
                                value={data.badge}
                                autoComplete="off"
                                placeholder="Más vendido"
                                onChange={(e) => setData('badge', e.target.value)}
                            />
                        </FormField>
                        <FormField
                            id="p-color"
                            label="Color"
                            hint="Color principal del plan en el sidebar y en Mi suscripción."
                            error={errors.color_hex}
                        >
                            <div className="flex items-center gap-2">
                                <Input
                                    id="p-color"
                                    type="color"
                                    value={pickerColor}
                                    aria-label="Elegir color del plan"
                                    className="h-9 w-12 cursor-pointer p-1"
                                    onChange={(e) => setData('color_hex', e.target.value)}
                                />
                                <Input
                                    value={data.color_hex}
                                    autoComplete="off"
                                    placeholder="#1e3a5f"
                                    className="font-mono"
                                    onChange={(e) => setData('color_hex', e.target.value)}
                                />
                            </div>
                        </FormField>
                        <div className="sm:col-span-2 rounded-lg border border-border/70 px-3 py-2.5">
                            <p className="mb-2 text-xs text-muted-foreground">Así se verá en el sidebar del taller</p>
                            <span
                                className="inline-flex rounded-lg px-2 py-1.5 ring-1 ring-black/5"
                                style={{ backgroundColor: `${previewColor}18` }}
                            >
                                <PlanMark
                                    nombre={data.nombre.trim() || 'Nombre del plan'}
                                    codigo={data.codigo || 'pro'}
                                    badge={data.badge}
                                    colorHex={HEX.test(data.color_hex) ? data.color_hex : previewColor}
                                />
                            </span>
                        </div>
                    </div>
                </FormSection>

                <FormSection
                    index={1}
                    title="Precios y prueba"
                    description="Precio mensual, precio anual y días de prueba."
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField id="p-mensual" label="Precio mensual (S/)" required error={errors.precio_mensual}>
                            <Input
                                id="p-mensual"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.precio_mensual}
                                className="font-mono"
                                onChange={(e) => setData('precio_mensual', e.target.value)}
                            />
                        </FormField>
                        <FormField
                            id="p-anual"
                            label="Precio anual (S/)"
                            hint="Opcional. Si se omite, solo se muestra el precio mensual."
                            error={errors.precio_anual}
                        >
                            <Input
                                id="p-anual"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.precio_anual}
                                className="font-mono"
                                onChange={(e) => setData('precio_anual', e.target.value)}
                            />
                        </FormField>
                        <FormField
                            id="p-trial"
                            label="Días de prueba"
                            required
                            hint="Días gratis antes del primer cobro."
                            error={errors.trial_days}
                        >
                            <Input
                                id="p-trial"
                                type="number"
                                min="0"
                                max="365"
                                value={data.trial_days}
                                onChange={(e) => setData('trial_days', e.target.value)}
                            />
                        </FormField>
                    </div>
                </FormSection>

                <FormSection index={2} title="Visibilidad" description="Quién puede ver y contratar este plan.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField id="p-publico" label="Visible públicamente" error={errors.es_publico}>
                            <label
                                htmlFor="p-publico"
                                className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <Checkbox
                                    id="p-publico"
                                    checked={data.es_publico}
                                    onCheckedChange={(checked) => setData('es_publico', checked === true)}
                                />
                                <span>{data.es_publico ? 'Público' : 'Privado'}</span>
                            </label>
                        </FormField>
                        <FormField id="p-activo" label="Plan activo" error={errors.activo}>
                            <label
                                htmlFor="p-activo"
                                className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <Checkbox
                                    id="p-activo"
                                    checked={data.activo}
                                    onCheckedChange={(checked) => setData('activo', checked === true)}
                                />
                                <span>{data.activo ? 'Activo' : 'Inactivo'}</span>
                            </label>
                        </FormField>
                    </div>
                </FormSection>
            </div>
        </FormModal>
    );
}
