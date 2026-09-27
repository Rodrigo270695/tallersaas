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
import suscripciones from '@/routes/plataforma/suscripciones';

export type SubscriptionPlanOption = {
    id: string;
    codigo: string;
    nombre: string;
};

export type EditableSubscription = {
    id: string;
    estado: string;
    ciclo: string;
    precio_pactado: string | number;
    trial_ends_at: string | null;
    current_period_end: string | null;
    grace_ends_at: string | null;
    plan?: { id: string; codigo: string; nombre: string } | null;
    tenant?: { razon_social: string; slug: string } | null;
};

type FormData = {
    plan_id: string;
    estado: string;
    ciclo: string;
    precio_pactado: string;
    trial_ends_at: string;
    current_period_end: string;
    grace_ends_at: string;
};

const LIMA = 'America/Lima';

function toDateInput(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value.slice(0, 10);
    }

    return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA }).format(date);
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
        precio_pactado: '0',
        trial_ends_at: '',
        current_period_end: '',
        grace_ends_at: '',
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
            precio_pactado: String(subscription.precio_pactado ?? '0'),
            trial_ends_at: toDateInput(subscription.trial_ends_at),
            current_period_end: toDateInput(subscription.current_period_end),
            grace_ends_at: toDateInput(subscription.grace_ends_at),
        });
    }, [open, subscription, clearErrors, setData]);

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

    const taller = subscription?.tenant?.razon_social ?? 'suscripción';

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Editar suscripción"
            description={taller}
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
                        Guardar cambios
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Contrato" columns={2}>
                <FormField id="sub-plan" label="Plan" required error={errors.plan_id}>
                    <Select value={data.plan_id} onValueChange={(value) => setData('plan_id', value)}>
                        <SelectTrigger id="sub-plan" className="w-full cursor-pointer">
                            <SelectValue placeholder="Elige un plan" />
                        </SelectTrigger>
                        <SelectContent>
                            {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id} className="cursor-pointer">
                                    {plan.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="sub-estado" label="Estado" required error={errors.estado}>
                    <Select value={data.estado} onValueChange={(value) => setData('estado', value)}>
                        <SelectTrigger id="sub-estado" className="w-full cursor-pointer">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="trial" className="cursor-pointer">
                                Prueba
                            </SelectItem>
                            <SelectItem value="active" className="cursor-pointer">
                                Activa
                            </SelectItem>
                            <SelectItem value="grace" className="cursor-pointer">
                                Gracia
                            </SelectItem>
                            <SelectItem value="suspended" className="cursor-pointer">
                                Suspendida
                            </SelectItem>
                            <SelectItem value="cancelled" className="cursor-pointer">
                                Cancelada
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="sub-ciclo" label="Ciclo" required error={errors.ciclo}>
                    <Select value={data.ciclo} onValueChange={(value) => setData('ciclo', value)}>
                        <SelectTrigger id="sub-ciclo" className="w-full cursor-pointer">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mensual" className="cursor-pointer">
                                Mensual
                            </SelectItem>
                            <SelectItem value="trimestral" className="cursor-pointer">
                                Trimestral
                            </SelectItem>
                            <SelectItem value="semestral" className="cursor-pointer">
                                Semestral
                            </SelectItem>
                            <SelectItem value="anual" className="cursor-pointer">
                                Anual
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="sub-precio" label="Precio" required error={errors.precio_pactado}>
                    <Input
                        id="sub-precio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio_pactado}
                        onChange={(event) => setData('precio_pactado', event.target.value)}
                    />
                </FormField>
                <FormField id="sub-trial" label="Prueba hasta" error={errors.trial_ends_at}>
                    <Input
                        id="sub-trial"
                        type="date"
                        value={data.trial_ends_at}
                        onChange={(event) => setData('trial_ends_at', event.target.value)}
                    />
                </FormField>
                <FormField id="sub-periodo" label="Periodo hasta" error={errors.current_period_end}>
                    <Input
                        id="sub-periodo"
                        type="date"
                        value={data.current_period_end}
                        onChange={(event) => setData('current_period_end', event.target.value)}
                    />
                </FormField>
                <FormField id="sub-gracia" label="Gracia hasta" error={errors.grace_ends_at}>
                    <Input
                        id="sub-gracia"
                        type="date"
                        value={data.grace_ends_at}
                        onChange={(event) => setData('grace_ends_at', event.target.value)}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}
