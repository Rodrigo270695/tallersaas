import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    Boxes,
    Building2,
    CalendarClock,
    Car,
    CreditCard,
    ExternalLink,
    Package,
    Sparkles,
    Users,
} from 'lucide-react';
import { planColor } from '@/components/tenant-plan-badge';
import { PageHeader } from '@/components/data-page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Plan = {
    nombre: string;
    codigo: string;
    badge: string | null;
    color_hex: string | null;
    descripcion: string | null;
};

type UsageItem = {
    key: string;
    label: string;
    used: number;
    limit: number;
};

type Subscription = {
    has_subscription: boolean;
    plan: Plan | null;
    estado: string;
    ciclo: string | null;
    precio_pactado: string | null;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    proximo_cobro_at: string | null;
    renewal_anchor_at: string | null;
    days_until_renewal: number | null;
    urgency: 'ok' | 'yellow' | 'amber' | 'red' | 'danger' | 'muted';
    renewal_url: string | null;
    usage: UsageItem[];
    comprobantes: {
        enabled: boolean;
        used: number;
        limit: number;
        period_label: string | null;
    };
};

const ESTADOS: Record<string, string> = {
    trial: 'Prueba',
    active: 'Activa',
    grace: 'Periodo de gracia',
    suspended: 'Suspendida',
    cancelled: 'Cancelada',
    unknown: 'Sin suscripción',
};

const CICLOS: Record<string, string> = {
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    clientes: Users,
    vehiculos: Car,
    usuarios: Users,
    productos: Boxes,
    sedes: Building2,
};

function money(value: string | number | null): string {
    if (value === null) {
        return '—';
    }

    const amount = typeof value === 'number' ? value : Number(value);

    return Number.isNaN(amount) ? '—' : `S/ ${amount.toFixed(2)}`;
}

function when(value: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function heroClass(urgency: Subscription['urgency'], codigo: string): string {
    if (urgency === 'danger' || urgency === 'red') {
        return 'from-red-800 via-red-700 to-red-900';
    }

    if (urgency === 'amber') {
        return 'from-amber-700 via-amber-600 to-orange-700';
    }

    if (urgency === 'yellow') {
        return 'from-yellow-700 via-yellow-600 to-amber-700';
    }

    if (codigo === 'free') {
        return 'from-stone-600 via-stone-500 to-stone-700';
    }

    if (codigo === 'basico') {
        return 'from-sky-800 via-sky-700 to-sky-900';
    }

    return 'from-[#16324f] via-[#1e3a5f] to-[#0f2744]';
}

function dateClass(urgency: Subscription['urgency']): string | undefined {
    if (urgency === 'red' || urgency === 'danger') {
        return 'text-red-700';
    }

    if (urgency === 'amber' || urgency === 'yellow') {
        return 'text-amber-700';
    }

    if (urgency === 'ok') {
        return 'text-emerald-700';
    }

    return undefined;
}

function InfoRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className={cn('text-right text-sm font-medium tabular-nums', valueClassName)}>{value}</span>
        </div>
    );
}

function semaphore(used: number, limit: number): 'ok' | 'warning' | 'over' {
    if (limit <= 0) {
        return used > 0 ? 'over' : 'ok';
    }

    if (used >= limit) {
        return 'over';
    }

    if (used / limit >= 0.8) {
        return 'warning';
    }

    return 'ok';
}

const SEMAPHORE = {
    ok: { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', label: 'Normal' },
    warning: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-900', label: 'Atención' },
    over: { bar: 'bg-red-500', badge: 'bg-red-100 text-red-800', label: 'Límite alcanzado' },
};

export default function Index({ subscription }: { subscription: Subscription | null }) {
    const plan = subscription?.plan;
    const codigo = plan?.codigo ?? 'pro';
    const urgency = subscription?.urgency ?? 'muted';
    const days = subscription?.days_until_renewal;
    const estado = ESTADOS[subscription?.estado ?? 'unknown'] ?? 'Sin suscripción';
    const ciclo = subscription?.ciclo ? (CICLOS[subscription.ciclo] ?? subscription.ciclo) : '—';
    const color = planColor(codigo, plan?.color_hex ?? null);
    const calm = urgency === 'ok' || urgency === 'muted';

    return (
        <>
            <Head title="Mi suscripción" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Mi suscripción"
                    description="Plan contratado, estado del servicio y fechas de renovación."
                />

                {subscription && urgency !== 'ok' ? (
                    <Alert className="border-amber-500/40 bg-amber-500/5 py-2.5 text-amber-900">
                        <AlertCircle className="size-4" />
                        <AlertDescription className="text-sm">
                            {urgency === 'danger'
                                ? 'La suscripción no está activa. Renueva para seguir trabajando.'
                                : days !== null && days < 0
                                  ? 'El periodo ya venció. Tienes un margen corto para renovar.'
                                  : `Faltan ${days ?? '—'} días para el próximo cobro.`}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {subscription ? (
                    <div
                        className={cn(
                            'overflow-hidden rounded-xl border border-white/10 text-white shadow-md',
                            calm ? '' : cn('bg-linear-to-r', heroClass(urgency, codigo)),
                        )}
                        style={calm ? { backgroundColor: color } : undefined}
                    >
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ring-1 ring-white/20">
                                        <Sparkles className="size-3" />
                                        Suscripción TallerSaaS
                                    </span>
                                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium ring-1 ring-white/20">
                                        {estado}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                    <h2 className="text-xl font-semibold tracking-tight">{plan?.nombre ?? 'Sin plan'}</h2>
                                    {plan?.badge ? (
                                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-white/25">
                                            {plan.badge}
                                        </span>
                                    ) : null}
                                    <span className="text-sm text-white/75">{ciclo}</span>
                                </div>
                                <p className="text-2xl font-bold tabular-nums leading-tight">
                                    {money(subscription.precio_pactado)}
                                </p>
                                {plan?.descripcion ? <p className="text-xs text-white/70">{plan.descripcion}</p> : null}
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-3">
                                <div className="rounded-lg bg-black/15 px-3 py-2 text-center ring-1 ring-white/15">
                                    {days !== null && days >= 0 ? (
                                        <>
                                            <p className="text-2xl leading-none font-bold tabular-nums">{days}</p>
                                            <p className="mt-0.5 text-[11px] text-white/80">
                                                {days === 0 ? 'vence hoy' : 'días para el próximo cobro'}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm font-semibold">{when(subscription.renewal_anchor_at)}</p>
                                    )}
                                    <p className="text-[11px] text-white/65">{when(subscription.proximo_cobro_at)}</p>
                                </div>
                                {subscription.renewal_url ? (
                                    <Button asChild size="sm" className="bg-white hover:bg-white/90" style={{ color }}>
                                        <a href={subscription.renewal_url} target="_blank" rel="noopener noreferrer">
                                            Renovar o pagar plan
                                            <ExternalLink className="size-3.5" />
                                        </a>
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-5 xl:grid-cols-12">
                    <div
                        className={cn(
                            'overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm',
                            subscription?.comprobantes.enabled ? 'xl:col-span-8' : 'xl:col-span-12',
                        )}
                    >
                        <div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                            <div className="p-4">
                                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    <Package className="size-3.5" />
                                    Tu plan
                                </h3>
                                <InfoRow label="Plan" value={plan?.nombre ?? '—'} />
                                <InfoRow label="Ciclo de facturación" value={ciclo} />
                                <InfoRow label="Precio pactado" value={money(subscription?.precio_pactado ?? null)} />
                            </div>
                            <div className="p-4">
                                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    <CalendarClock className="size-3.5" />
                                    Fechas importantes
                                </h3>
                                {subscription?.estado === 'trial' ? (
                                    <InfoRow label="Fin de la prueba" value={when(subscription.trial_ends_at)} />
                                ) : null}
                                <InfoRow label="Inicio del periodo" value={when(subscription?.current_period_start ?? null)} />
                                <InfoRow label="Fin del periodo" value={when(subscription?.current_period_end ?? null)} />
                                <InfoRow
                                    label="Próximo cobro"
                                    value={when(subscription?.proximo_cobro_at ?? null)}
                                    valueClassName={dateClass(urgency)}
                                />
                                <InfoRow
                                    label="Próximo vencimiento"
                                    value={when(subscription?.renewal_anchor_at ?? null)}
                                    valueClassName={dateClass(urgency)}
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    <CreditCard className="size-3.5" />
                                    Renovar servicio
                                </h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    El pago se procesa en el portal de Orvae. Tras confirmarlo, el periodo se extiende
                                    solo.
                                </p>
                                <div className="mt-3">
                                    {subscription?.renewal_url ? (
                                        <Button asChild size="sm">
                                            <a href={subscription.renewal_url} target="_blank" rel="noopener noreferrer">
                                                Renovar o pagar plan
                                                <ExternalLink className="size-3.5" />
                                            </a>
                                        </Button>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No hay un enlace de pago disponible.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {subscription?.comprobantes.enabled ? (
                        <section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm xl:col-span-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">Comprobantes electrónicos</h3>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                        SEMAPHORE[semaphore(subscription.comprobantes.used, subscription.comprobantes.limit)].badge,
                                    )}
                                >
                                    {SEMAPHORE[semaphore(subscription.comprobantes.used, subscription.comprobantes.limit)].label}
                                </span>
                            </div>
                            <p className="text-sm">
                                Has emitido {subscription.comprobantes.used} de {subscription.comprobantes.limit} comprobantes
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{subscription.comprobantes.period_label}</p>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn(
                                        'h-full',
                                        SEMAPHORE[semaphore(subscription.comprobantes.used, subscription.comprobantes.limit)].bar,
                                    )}
                                    style={{
                                        width: `${Math.min(100, (subscription.comprobantes.used / Math.max(subscription.comprobantes.limit, 1)) * 100)}%`,
                                    }}
                                />
                            </div>
                        </section>
                    ) : null}
                </div>

                <section>
                    <h2 className="text-sm font-semibold">Uso de tu plan</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Consumo actual frente a los límites del plan.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {(subscription?.usage ?? []).map((item) => {
                            const level = semaphore(item.used, item.limit);
                            const tone = SEMAPHORE[level];
                            const Icon = ICONS[item.key] ?? Package;
                            const ratio = item.limit > 0 ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;

                            return (
                                <article key={item.key} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="flex items-center gap-2 text-sm font-medium">
                                            <Icon className="size-4 text-muted-foreground" />
                                            {item.label}
                                        </p>
                                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', tone.badge)}>
                                            {tone.label}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm tabular-nums">
                                        {item.used} de {item.limit}
                                    </p>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className={cn('h-full', tone.bar)} style={{ width: `${ratio}%` }} />
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {ratio}% · Quedan {Math.max(item.limit - item.used, 0)}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Configuración' },
        { title: 'Mi suscripción', href: '/configuracion/suscripcion' },
    ],
};
