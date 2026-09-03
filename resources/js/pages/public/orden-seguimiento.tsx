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
                <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6 pb-10 sm:py-10">
                    <header className="space-y-3 text-center">
                        {taller.logo_url ? (
                            <img
                                src={taller.logo_url}
                                alt={taller.nombre}
                                className="mx-auto h-12 w-auto object-contain"
                            />
                        ) : (
                            <p className="text-sm font-semibold tracking-wide text-brand-700">
                                {taller.nombre}
                            </p>
                        )}
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Seguimiento de orden
                            </p>
                            <h1 className="font-mono text-2xl font-semibold tracking-tight text-stone-900">
                                {orden.numero}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {orden.cliente_nombre ?? 'Cliente'} · {orden.vehiculo_label}
                            </p>
                        </div>
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-800 shadow-sm ring-1 ring-brand-200/80">
                            <span className="size-1.5 rounded-full bg-brand-500" />
                            {estadoActual}
                        </p>
                    </header>

                    <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-stone-900">Progreso</h2>
                            {orden.prometida_at ? (
                                <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Clock3 className="size-3.5" />
                                    {formatWhen(orden.prometida_at)}
                                </p>
                            ) : null}
                        </div>

                        <ol className="relative ml-2 space-y-0 border-l-2 border-stone-200 pl-0">
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
                                            <p className="mt-0.5 text-xs text-muted-foreground">
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
                        <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
                            <h2 className="mb-3 text-sm font-semibold text-stone-900">
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
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                                    {orden.solicitud_cliente}
                                </p>
                            ) : null}
                        </section>
                    )}

                    <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
                        <div className="mb-3 flex items-center gap-2">
                            <Camera className="size-4 text-brand-600" />
                            <h2 className="text-sm font-semibold text-stone-900">Fotos</h2>
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
                                        'min-h-11 rounded-lg px-1 py-2 text-center text-xs font-semibold transition-colors',
                                        etapa === item.value
                                            ? 'bg-white text-stone-900 shadow-sm'
                                            : 'text-muted-foreground',
                                    )}
                                    onClick={() => setEtapa(item.value)}
                                >
                                    {item.label}
                                    <span className="mt-0.5 block text-[10px] font-normal tabular-nums text-muted-foreground">
                                        {counts[item.value]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {fotosEtapa.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                Aún no hay fotos de {ETAPAS.find((e) => e.value === etapa)?.label.toLowerCase()}.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {fotosEtapa.map((foto) => (
                                    <figure
                                        key={foto.id}
                                        className="overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50"
                                    >
                                        {foto.url ? (
                                            <img
                                                src={foto.url}
                                                alt={foto.nota || 'Foto del taller'}
                                                className="aspect-square w-full object-cover"
                                            />
                                        ) : null}
                                        <figcaption className="space-y-0.5 p-2">
                                            {foto.nota ? (
                                                <p className="truncate text-xs text-stone-800">
                                                    {foto.nota}
                                                </p>
                                            ) : null}
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatWhen(foto.created_at)}
                                            </p>
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        )}
                    </section>

                    {taller.telefono ? (
                        <a
                            href={`tel:${taller.telefono}`}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
                        >
                            <Phone className="size-4" />
                            Llamar al taller
                        </a>
                    ) : (
                        <p className="text-center text-xs text-muted-foreground">{taller.nombre}</p>
                    )}
                </div>
            </div>
        </>
    );
}
