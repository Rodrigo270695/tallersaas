import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import suscripciones from '@/routes/plataforma/suscripciones';

export type SubscriptionPlanOption = {
    id: string;
    codigo: string;
    nombre: string;
    precio_mensual?: string | number;
    precio_anual?: string | number | null;
    trial_days?: number;
};

export type EditableSubscription = {
    id: string;
    estado: string;
    ciclo: string;
    precio_pactado: string | number;
    descuento_pct?: string | number | null;
    trial_ends_at: string | null;
    current_period_start?: string | null;
    current_period_end: string | null;
    grace_ends_at: string | null;
    proximo_cobro_at?: string | null;
    cancel_reason?: string | null;
    cancel_feedback?: string | null;
    plan?: { id: string; codigo: string; nombre: string } | null;
    tenant?: { id?: string; razon_social: string; slug: string } | null;
};

type FormData = {
    plan_id: string;
    estado: string;
    ciclo: string;
    precio_pactado: string;
    descuento_pct: string;
    trial_ends_at: string;
    current_period_start: string;
    current_period_end: string;
    grace_ends_at: string;
    proximo_cobro_at: string;
    cancel_reason: string;
    cancel_feedback: string;
};

const LIMA = 'America/Lima';
const GRACE_DAYS = 3;

const ESTADOS = [
    { value: 'trial', label: 'Prueba' },
    { value: 'active', label: 'Activa' },
    { value: 'grace', label: 'Gracia' },
    { value: 'suspended', label: 'Suspendida' },
    { value: 'cancelled', label: 'Cancelada' },
] as const;

const CICLOS = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' },
] as const;

function pad(n: number): string {
    return n.toString().padStart(2, '0');
}

function formatDateTimeLocal(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: LIMA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function nowDateTimeLocal(): string {
    return formatDateTimeLocal(new Date().toISOString());
}

function cycleMonths(ciclo: string): number {
    switch (ciclo) {
        case 'trimestral':
            return 3;
        case 'semestral':
            return 6;
        case 'anual':
            return 12;
        default:
            return 1;
    }
}

function addMonths(value: string, months: number): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    date.setMonth(date.getMonth() + months);

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDays(value: string, days: number): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    date.setDate(date.getDate() + days);

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function suggestedPlanPrice(
    plan: SubscriptionPlanOption,
    ciclo: string,
): string | null {
    if (plan.precio_mensual == null) {
        return null;
    }

    const mensual = Number(plan.precio_mensual);
    if (ciclo === 'anual' && plan.precio_anual != null && plan.precio_anual !== '') {
        return String(plan.precio_anual);
    }

    return String(Math.round(mensual * cycleMonths(ciclo) * 100) / 100);
}

export function SubscriptionFormModal({
    open,
    onOpenChange,
    subscription,
    plans,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription: EditableSubscription | null;
    plans: readonly SubscriptionPlanOption[];
}) {
    const { data, setData, put, processing, errors, clearErrors } = useForm<FormData>({
        plan_id: '',
        estado: 'trial',
        ciclo: 'mensual',
        precio_pactado: '0.00',
        descuento_pct: '0',
        trial_ends_at: '',
        current_period_start: '',
        current_period_end: '',
        grace_ends_at: '',
        proximo_cobro_at: '',
        cancel_reason: '',
        cancel_feedback: '',
    });

    useEffect(() => {
        if (!open || subscription === null) {
            return;
        }

        clearErrors();
        setData({
            plan_id: subscription.plan?.id ?? '',
            estado: subscription.estado,
            ciclo: subscription.ciclo || 'mensual',
            precio_pactado: String(subscription.precio_pactado ?? '0.00'),
            descuento_pct: String(subscription.descuento_pct ?? '0'),
            trial_ends_at: formatDateTimeLocal(subscription.trial_ends_at),
            current_period_start: formatDateTimeLocal(subscription.current_period_start),
            current_period_end: formatDateTimeLocal(subscription.current_period_end),
            grace_ends_at: formatDateTimeLocal(subscription.grace_ends_at),
            proximo_cobro_at: formatDateTimeLocal(subscription.proximo_cobro_at),
            cancel_reason: subscription.cancel_reason ?? '',
            cancel_feedback: subscription.cancel_feedback ?? '',
        });
    }, [open, subscription, clearErrors, setData]);

    const applyPeriodEnd = (value: string, extra?: Partial<FormData>) => {
        setData((current) => ({
            ...current,
            ...extra,
            current_period_end: value,
            proximo_cobro_at: value,
            grace_ends_at: addDays(value, GRACE_DAYS),
        }));
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (subscription === null) {
            return;
        }

        put(suscripciones.update(subscription.id).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Editar suscripción"
            description="Ajusta el plan, el estado y las fechas de esta suscripción."
            size="xl"
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
                        disabled={processing}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Guardar cambios
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title="Contrato"
                    description="Taller, plan, estado y términos económicos."
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            id="sub-tenant"
                            label="Taller"
                            required
                            hint="Cliente al que se asocia la suscripción. No se puede cambiar después."
                        >
                            <Select value={subscription?.tenant?.id ?? 'actual'} disabled>
                                <SelectTrigger id="sub-tenant" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={subscription?.tenant?.id ?? 'actual'}>
                                        <span className="font-medium">
                                            {subscription?.tenant?.razon_social ?? '—'}
                                        </span>
                                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                                            {subscription?.tenant?.slug}
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField id="sub-plan" label="Plan" required error={errors.plan_id}>
                            <Select
                                value={data.plan_id}
                                onValueChange={(value) => setData('plan_id', value)}
                            >
                                <SelectTrigger id="sub-plan" className="w-full cursor-pointer">
                                    <SelectValue placeholder="Elige un plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem
                                            key={plan.id}
                                            value={plan.id}
                                            className="cursor-pointer"
                                        >
                                            <span className="font-medium">{plan.nombre}</span>
                                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                                                {plan.codigo}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField id="sub-estado" label="Estado" required error={errors.estado}>
                            <Select
                                value={data.estado}
                                onValueChange={(value) => setData('estado', value)}
                            >
                                <SelectTrigger id="sub-estado" className="w-full cursor-pointer">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ESTADOS.map((estado) => (
                                        <SelectItem
                                            key={estado.value}
                                            value={estado.value}
                                            className="cursor-pointer"
                                        >
                                            {estado.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField
                            id="sub-ciclo"
                            label="Ciclo de facturación"
                            required
                            error={errors.ciclo}
                        >
                            <Select
                                value={data.ciclo}
                                onValueChange={(value) => {
                                    const plan = plans.find((item) => item.id === data.plan_id);
                                    const price = plan ? suggestedPlanPrice(plan, value) : null;
                                    const start = data.current_period_start || nowDateTimeLocal();
                                    const end = addMonths(start, cycleMonths(value));

                                    applyPeriodEnd(end, {
                                        ciclo: value,
                                        ...(price !== null ? { precio_pactado: price } : {}),
                                        ...(!data.current_period_start
                                            ? { current_period_start: start }
                                            : {}),
                                    });
                                }}
                            >
                                <SelectTrigger id="sub-ciclo" className="w-full cursor-pointer">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CICLOS.map((ciclo) => (
                                        <SelectItem
                                            key={ciclo.value}
                                            value={ciclo.value}
                                            className="cursor-pointer"
                                        >
                                            {ciclo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField
                            id="sub-precio"
                            label="Precio pactado (S/)"
                            required
                            hint="Lo que el cliente paga en cada ciclo."
                            error={errors.precio_pactado}
                        >
                            <Input
                                id="sub-precio"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.precio_pactado}
                                onChange={(event) => setData('precio_pactado', event.target.value)}
                                className="font-mono"
                            />
                        </FormField>

                        <FormField
                            id="sub-descuento"
                            label="Descuento (%)"
                            error={errors.descuento_pct}
                        >
                            <Input
                                id="sub-descuento"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={data.descuento_pct}
                                onChange={(event) => setData('descuento_pct', event.target.value)}
                                className="font-mono"
                            />
                        </FormField>
                    </div>
                </FormSection>

                <FormSection
                    index={1}
                    title="Fechas clave"
                    description="Fechas del ciclo de vida. La gracia se calcula sola: fin del periodo + 3 días."
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            id="sub-trial"
                            label="Fin del periodo de prueba"
                            error={errors.trial_ends_at}
                        >
                            <Input
                                id="sub-trial"
                                type="datetime-local"
                                value={data.trial_ends_at}
                                onChange={(event) => setData('trial_ends_at', event.target.value)}
                            />
                        </FormField>

                        <FormField
                            id="sub-cobro"
                            label="Próximo cobro"
                            error={errors.proximo_cobro_at}
                        >
                            <Input
                                id="sub-cobro"
                                type="datetime-local"
                                value={data.proximo_cobro_at}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setData((current) => ({
                                        ...current,
                                        proximo_cobro_at: value,
                                        grace_ends_at: addDays(value, GRACE_DAYS),
                                    }));
                                }}
                            />
                        </FormField>

                        <FormField
                            id="sub-inicio"
                            label="Inicio del periodo actual"
                            error={errors.current_period_start}
                        >
                            <Input
                                id="sub-inicio"
                                type="datetime-local"
                                value={data.current_period_start}
                                onChange={(event) =>
                                    setData('current_period_start', event.target.value)
                                }
                            />
                        </FormField>

                        <FormField
                            id="sub-periodo"
                            label="Fin del periodo actual"
                            error={errors.current_period_end}
                        >
                            <Input
                                id="sub-periodo"
                                type="datetime-local"
                                value={data.current_period_end}
                                onChange={(event) => applyPeriodEnd(event.target.value)}
                            />
                        </FormField>

                        <FormField
                            id="sub-gracia"
                            label="Fin del periodo de gracia"
                            hint="Por defecto es el fin del periodo + 3 días. Puedes ajustarlo a mano después."
                            error={errors.grace_ends_at}
                        >
                            <Input
                                id="sub-gracia"
                                type="datetime-local"
                                value={data.grace_ends_at}
                                onChange={(event) => setData('grace_ends_at', event.target.value)}
                            />
                        </FormField>
                    </div>
                </FormSection>

                {data.estado === 'cancelled' && (
                    <FormSection
                        index={2}
                        title="Cancelación"
                        description="Motivo interno y comentario del cliente."
                    >
                        <div className="grid grid-cols-1 gap-4">
                            <FormField
                                id="sub-cancel-reason"
                                label="Motivo de cancelación"
                                error={errors.cancel_reason}
                            >
                                <Textarea
                                    id="sub-cancel-reason"
                                    value={data.cancel_reason}
                                    onChange={(event) =>
                                        setData('cancel_reason', event.target.value)
                                    }
                                    rows={2}
                                />
                            </FormField>
                            <FormField
                                id="sub-cancel-feedback"
                                label="Comentario"
                                error={errors.cancel_feedback}
                            >
                                <Textarea
                                    id="sub-cancel-feedback"
                                    value={data.cancel_feedback}
                                    onChange={(event) =>
                                        setData('cancel_feedback', event.target.value)
                                    }
                                    rows={3}
                                />
                            </FormField>
                        </div>
                    </FormSection>
                )}
            </div>
        </FormModal>
    );
}
