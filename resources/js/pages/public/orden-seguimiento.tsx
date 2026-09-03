import { Head } from '@inertiajs/react';
import { Camera, CheckCircle2, Circle, Clock3, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type TimelineStep = {
    key: string;
    label: string;
    description?: string | null;
    at: string | null;
    done: boolean;
    current?: boolean;
};

type FotoEtapa = 'ingreso' | 'proceso' | 'entrega';

type Foto = {
    id: string;
    url: string | null;
    etapa?: FotoEtapa | string | null;
    nota: string | null;
    created_at: string | null;
};

type Props = {
    orden: {
        numero: string;
        estado: string;
        ingreso_at: string | null;
        prometida_at: string | null;
        lista_at: string | null;
        entregada_at: string | null;
        km_ingreso: number | null;
        solicitud_cliente: string | null;
        cliente_nombre: string | null;
        vehiculo_label: string;
        timeline: TimelineStep[];
    };
    fotos: Foto[];
    taller: {
        nombre: string;
        telefono: string | null;
        logo_url: string | null;
    };
    token: string;
};

const ETAPAS: { value: FotoEtapa; label: string }[] = [
    { value: 'ingreso', label: 'Ingreso' },
    { value: 'proceso', label: 'Proceso' },
    { value: 'entrega', label: 'Entrega' },
];

const estadoLabel: Record<string, string> = {
    abierta: 'Recepcionada',
    en_proceso: 'En taller',
    lista: 'Lista para recoger',
    entregada: 'Entregada',
};

const defaultEtapa = (estado: string): FotoEtapa => {
    if (estado === 'abierta') {
        return 'ingreso';
    }

    if (estado === 'lista' || estado === 'entregada') {
        return 'entrega';
    }

    return 'proceso';
};

const formatWhen = (iso: string | null): string => {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleString('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

export default function OrdenSeguimientoPublico({ orden, fotos, taller }: Props) {
    const estadoActual = estadoLabel[orden.estado] ?? orden.estado;
    const [etapa, setEtapa] = useState<FotoEtapa>(() => defaultEtapa(orden.estado));
    const [preview, setPreview] = useState<Foto | null>(null);

    const counts = useMemo(() => {
        const map: Record<FotoEtapa, number> = { ingreso: 0, proceso: 0, entrega: 0 };
        for (const foto of fotos) {
            const key = (foto.etapa ?? 'proceso') as FotoEtapa;
            if (key in map) {
                map[key] += 1;
            } else {
                map.proceso += 1;
            }
        }

        return map;
    }, [fotos]);

    const fotosEtapa = useMemo(
        () => fotos.filter((f) => (f.etapa ?? 'proceso') === etapa),
        [fotos, etapa],
    );

    return (
        <>
            <Head title={`Seguimiento ${orden.numero}`} />

            <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50 via-stone-50 to-stone-100">
                <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                    {/* Header: apilado en móvil, barra en PC */}
                    <header className="mb-5 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:mb-6 sm:p-6 lg:mb-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:items-center lg:gap-5 lg:text-left">
                                {taller.logo_url ? (
                                    <img
                                        src={taller.logo_url}
                                        alt={taller.nombre}
                                        className="h-12 w-auto object-contain lg:h-14"
                                    />
                                ) : (
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-200/70 lg:size-14 lg:text-base">
                                        {taller.nombre.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {taller.nombre} · Seguimiento
                                    </p>
                                    <h1 className="font-mono text-2xl font-semibold tracking-tight text-stone-900 lg:text-3xl">
                                        {orden.numero}
                                    </h1>
                                    <p className="text-sm text-muted-foreground lg:text-base">
                                        {orden.cliente_nombre ?? 'Cliente'} · {orden.vehiculo_label}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-3 lg:items-end">
                                <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 ring-1 ring-brand-200/80 lg:text-sm">
                                    <span className="size-1.5 rounded-full bg-brand-500" />
                                    {estadoActual}
                                </p>
                                {taller.telefono ? (
                                    <a
                                        href={`tel:${taller.telefono}`}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
                                    >
                                        <Phone className="size-4" />
                                        <span className="lg:hidden">Llamar al taller</span>
                                        <span className="hidden lg:inline">{taller.telefono}</span>
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </header>

                    {/* Móvil: columna · PC: progreso | fotos */}
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
                        <div className="flex flex-col gap-5 lg:gap-6">
                            <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
                                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-sm font-semibold text-stone-900 lg:text-base">
                                        Progreso
                                    </h2>
                                    {orden.prometida_at ? (
                                        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground lg:text-xs">
                                            <Clock3 className="size-3.5" />
                                            Prometida {formatWhen(orden.prometida_at)}
                                        </p>
                                    ) : null}
                                </div>

                                <ol className="relative ml-2 space-y-0 border-l-2 border-stone-200">
                                    {orden.timeline.map((step) => (
                                        <li key={step.key} className="relative pb-5 pl-6 last:pb-0">
                                            <span className="absolute -left-[9px] top-0.5 rounded-full bg-white">
                                                {step.done ? (
                                                    <CheckCircle2
                                                        className={
                                                            step.current
                                                                ? 'size-4 text-brand-600'
                                                                : 'size-4 text-emerald-600'
                                                        }
                                                    />
                                                ) : (
                                                    <Circle className="size-4 text-stone-300" />
                                                )}
                                            </span>
                                            <div
                                                className={
                                                    step.current
                                                        ? 'rounded-xl bg-brand-50/80 px-3 py-2 ring-1 ring-brand-100'
                                                        : ''
                                                }
                                            >
                                                <p
                                                    className={
                                                        step.done || step.current
                                                            ? 'text-sm font-semibold text-stone-900'
                                                            : 'text-sm text-muted-foreground'
                                                    }
                                                >
                                                    {step.label}
                                                </p>
                                                {step.description ? (
                                                    <p className="mt-0.5 text-xs text-muted-foreground lg:text-sm">
                                                        {step.description}
                                                    </p>
                                                ) : null}
                                                {step.done && step.at ? (
                                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                                        {formatWhen(step.at)}
                                                    </p>
                                                ) : !step.done ? (
                                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                                        Pendiente
                                                    </p>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            {(orden.solicitud_cliente || orden.km_ingreso != null) && (
                                <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
                                    <h2 className="mb-3 text-sm font-semibold text-stone-900 lg:text-base">
                                        Motivo de ingreso
                                    </h2>
                                    {orden.km_ingreso != null ? (
                                        <p className="mb-2 text-sm text-muted-foreground">
                                            Km:{' '}
                                            <span className="font-medium text-stone-800">
                                                {orden.km_ingreso.toLocaleString('es-PE')}
                                            </span>
                                        </p>
                                    ) : null}
                                    {orden.solicitud_cliente ? (
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700 lg:text-[15px]">
                                            {orden.solicitud_cliente}
                                        </p>
                                    ) : null}
                                </section>
                            )}
                        </div>

                        <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6 lg:min-h-[28rem]">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Camera className="size-4 text-brand-600 lg:size-5" />
                                    <h2 className="text-sm font-semibold text-stone-900 lg:text-base">
                                        Fotos
                                    </h2>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {ETAPAS.find((e) => e.value === etapa)?.label}
                                </p>
                            </div>

                            <div
                                role="tablist"
                                className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1"
                            >
                                {ETAPAS.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        role="tab"
                                        aria-selected={etapa === item.value}
                                        className={cn(
                                            'min-h-11 rounded-lg px-1 py-2 text-center text-xs font-semibold transition-colors lg:text-sm',
                                            etapa === item.value
                                                ? 'bg-white text-stone-900 shadow-sm'
                                                : 'text-muted-foreground hover:text-stone-700',
                                        )}
                                        onClick={() => setEtapa(item.value)}
                                    >
                                        {item.label}
                                        <span className="mt-0.5 block text-[10px] font-normal tabular-nums text-muted-foreground lg:text-xs">
                                            {counts[item.value]}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {fotosEtapa.length === 0 ? (
                                <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/60 px-4 py-10 text-center lg:min-h-64">
                                    <Camera className="mb-2 size-8 text-stone-300" />
                                    <p className="text-sm text-muted-foreground">
                                        Aún no hay fotos de{' '}
                                        {ETAPAS.find((e) => e.value === etapa)?.label.toLowerCase()}.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                                    {fotosEtapa.map((foto) => (
                                        <button
                                            key={foto.id}
                                            type="button"
                                            className="group overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50 text-left transition hover:border-brand-300 hover:shadow-sm"
                                            onClick={() => setPreview(foto)}
                                        >
                                            {foto.url ? (
                                                <img
                                                    src={foto.url}
                                                    alt={foto.nota || 'Foto del taller'}
                                                    className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                                                />
                                            ) : null}
                                            <figcaption className="space-y-0.5 p-2 sm:p-2.5">
                                                {foto.nota ? (
                                                    <p className="truncate text-xs text-stone-800 sm:text-sm">
                                                        {foto.nota}
                                                    </p>
                                                ) : null}
                                                <p className="text-[10px] text-muted-foreground sm:text-[11px]">
                                                    {formatWhen(foto.created_at)}
                                                </p>
                                            </figcaption>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    <footer className="mt-8 text-center text-xs text-muted-foreground lg:mt-10">
                        {taller.nombre}
                    </footer>
                </div>
            </div>

            {preview?.url ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
                    onClick={() => setPreview(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setPreview(null);
                        }
                    }}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                        onClick={() => setPreview(null)}
                    >
                        Cerrar
                    </button>
                    <figure
                        className="max-h-[90dvh] w-full max-w-3xl overflow-hidden rounded-2xl bg-stone-900 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={preview.url}
                            alt={preview.nota || 'Foto del taller'}
                            className="max-h-[80dvh] w-full object-contain"
                        />
                        {(preview.nota || preview.created_at) && (
                            <figcaption className="space-y-0.5 px-4 py-3 text-sm text-stone-200">
                                {preview.nota ? <p>{preview.nota}</p> : null}
                                <p className="text-xs text-stone-400">
                                    {formatWhen(preview.created_at)}
                                </p>
                            </figcaption>
                        )}
                    </figure>
                </div>
            ) : null}
        </>
    );
}
