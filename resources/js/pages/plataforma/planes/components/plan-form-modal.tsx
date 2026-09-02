import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    orden: string;
    es_publico: boolean;
    activo: boolean;
};

const emptyForm: FormData = {
    codigo: '',
    nombre: '',
    descripcion: '',
    badge: '',
    color_hex: '#F97316',
    precio_mensual: '0',
    precio_anual: '',
    trial_days: '14',
    orden: '0',
    es_publico: true,
    activo: true,
};

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

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        if (plan) {
            setData({
                codigo: plan.codigo,
                nombre: plan.nombre,
                descripcion: plan.descripcion ?? '',
                badge: plan.badge ?? '',
                color_hex: plan.color_hex ?? '#F97316',
                precio_mensual: String(plan.precio_mensual),
                precio_anual: plan.precio_anual ? String(plan.precio_anual) : '',
                trial_days: String(plan.trial_days),
                orden: String(plan.orden),
                es_publico: plan.es_publico,
                activo: plan.activo,
            });
        } else {
            reset();
            setData(emptyForm);
        }
    }, [open, plan, clearErrors, reset, setData]);

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
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar plan' : 'Nuevo plan'}
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
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
            <FormSection index={0} title="Plan" columns={2}>
                <FormField id="p-codigo" label="Código" required error={errors.codigo}>
                    <Input
                        id="p-codigo"
                        value={data.codigo}
                        disabled={isEdit}
                        onChange={(e) => setData('codigo', e.target.value)}
                        placeholder="starter"
                    />
                </FormField>
                <FormField id="p-nombre" label="Nombre" required error={errors.nombre}>
                    <Input
                        id="p-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="p-desc"
                    label="Descripción"
                    error={errors.descripcion}
                    className="sm:col-span-2"
                >
                    <Textarea
                        id="p-desc"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        rows={2}
                    />
                </FormField>
                <FormField id="p-mensual" label="Precio mensual" required error={errors.precio_mensual}>
                    <Input
                        id="p-mensual"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio_mensual}
                        onChange={(e) => setData('precio_mensual', e.target.value)}
                    />
                </FormField>
                <FormField id="p-anual" label="Precio anual" error={errors.precio_anual}>
                    <Input
                        id="p-anual"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio_anual}
                        onChange={(e) => setData('precio_anual', e.target.value)}
                    />
                </FormField>
                <FormField id="p-trial" label="Días de prueba" required error={errors.trial_days}>
                    <Input
                        id="p-trial"
                        type="number"
                        min="0"
                        value={data.trial_days}
                        onChange={(e) => setData('trial_days', e.target.value)}
                    />
                </FormField>
                <FormField id="p-orden" label="Orden" required error={errors.orden}>
                    <Input
                        id="p-orden"
                        type="number"
                        min="0"
                        value={data.orden}
                        onChange={(e) => setData('orden', e.target.value)}
                    />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                    <Checkbox
                        checked={data.es_publico}
                        onCheckedChange={(checked) => setData('es_publico', checked === true)}
                    />
                    <span className="text-sm">Visible públicamente</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                    <Checkbox
                        checked={data.activo}
                        onCheckedChange={(checked) => setData('activo', checked === true)}
                    />
                    <span className="text-sm">Plan activo</span>
                </label>
            </FormSection>
        </FormModal>
    );
}
