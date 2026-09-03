import { Head } from '@inertiajs/react';
import { Camera, CheckCircle2, Circle, Clock3, Phone, X } from 'lucide-react';
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

            <div className="min-h-dvh bg-stone-100">
                <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
                    <header className="mb-5 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                                {taller.logo_url ? (
                                    <img
                                        src={taller.logo_url}
                                        alt={taller.nombre}
                                        className="h-11 w-auto shrink-0 object-contain sm:h-12"
                                    />
                                ) : (
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-orange-700 ring-1 ring-orange-200 sm:size-12">
                                        {taller.nombre.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
                                        {taller.nombre} · Seguimiento
                                    </p>
                                    <h1 className="font-mono text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl lg:text-3xl">
                                        {orden.numero}
                                    </h1>
                                    <p className="mt-0.5 truncate text-sm text-stone-600">
                                        {orden.cliente_nombre ?? 'Cliente'} · {orden.vehiculo_label}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800 ring-1 ring-orange-200">
                                    <span className="size-1.5 rounded-full bg-orange-500" />
                                    {estadoActual}
                                </span>
                                {taller.telefono ? (
                                    <a
                                        href={`tel:${taller.telefono}`}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-stone-900 px-3.5 text-sm font-medium text-white hover:bg-stone-800"
                                    >
                                        <Phone className="size-4" />
                                        {taller.telefono}
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
                        {/* Progreso: 1 col móvil · 4/12 en PC */}
                        <div className="flex min-w-0 flex-col gap-5 lg:col-span-4">
                            <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-sm font-semibold text-stone-900">Progreso</h2>
                                    {orden.prometida_at ? (
                                        <p className="inline-flex items-center gap-1 text-xs text-stone-500">
                                            <Clock3 className="size-3.5 shrink-0" />
                                            Prometida {formatWhen(orden.prometida_at)}
                                        </p>
                                    ) : null}
                                </div>

                                <ol className="relative ml-2 border-l-2 border-stone-200">
                                    {orden.timeline.map((step) => (
                                        <li key={step.key} className="relative pb-5 pl-5 last:pb-0">
                                            <span className="absolute -left-[9px] top-0.5 bg-white">
                                                {step.done ? (
                                                    <CheckCircle2
                                                        className={
                                                            step.current
                                                                ? 'size-4 text-orange-600'
                                                                : 'size-4 text-emerald-600'
                                                        }
                                                    />
                                                ) : (
                                                    <Circle className="size-4 text-stone-300" />
                                                )}
                                            </span>
                                            <div
                                                className={cn(
                                                    step.current &&
                                                        'rounded-xl bg-orange-50 px-3 py-2 ring-1 ring-orange-100',
                                                )}
                                            >
                                                <p
                                                    className={cn(
                                                        'text-sm',
                                                        step.done || step.current
                                                            ? 'font-semibold text-stone-900'
                                                            : 'text-stone-500',
                                                    )}
                                                >
                                                    {step.label}
                                                </p>
                                                {step.description ? (
                                                    <p className="mt-0.5 text-xs text-stone-500">
                                                        {step.description}
                                                    </p>
                                                ) : null}
                                                <p className="mt-1 text-[11px] text-stone-400">
                                                    {step.done && step.at
                                                        ? formatWhen(step.at)
                                                        : 'Pendiente'}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            {(orden.solicitud_cliente || orden.km_ingreso != null) && (
                                <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
                                    <h2 className="mb-2 text-sm font-semibold text-stone-900">
                                        Motivo de ingreso
                                    </h2>
                                    {orden.km_ingreso != null ? (
                                        <p className="mb-2 text-sm text-stone-500">
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
                        </div>

                        {/* Fotos: 1 col móvil · 8/12 en PC */}
                        <section className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5 lg:col-span-8">
                            <div className="mb-4 flex items-center gap-2">
                                <Camera className="size-4 text-orange-600" />
                                <h2 className="text-sm font-semibold text-stone-900">Fotos</h2>
                            </div>

                            <div
                                role="tablist"
                                className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1"
                            >
                                {ETAPAS.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        role="tab"
                                        aria-selected={etapa === item.value}
                                        className={cn(
                                            'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-2 py-2 text-center transition-colors',
                                            etapa === item.value
                                                ? 'bg-white font-semibold text-stone-900 shadow-sm'
                                                : 'text-stone-500 hover:text-stone-700',
                                        )}
                                        onClick={() => setEtapa(item.value)}
                                    >
                                        <span className="text-xs sm:text-sm">{item.label}</span>
                                        <span className="text-[10px] tabular-nums text-stone-400">
                                            {counts[item.value]}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {fotosEtapa.length === 0 ? (
                                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center">
                                    <Camera className="mb-2 size-8 text-stone-300" />
                                    <p className="text-sm text-stone-500">
                                        Aún no hay fotos de{' '}
                                        {ETAPAS.find((e) => e.value === etapa)?.label.toLowerCase()}.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                                    {fotosEtapa.map((foto) => (
                                        <button
                                            key={foto.id}
                                            type="button"
                                            className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-stone-50 text-left hover:border-orange-300 hover:shadow-sm"
                                            onClick={() => setPreview(foto)}
                                        >
                                            {foto.url ? (
                                                <img
                                                    src={foto.url}
                                                    alt={foto.nota || 'Foto del taller'}
                                                    className="aspect-square w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex aspect-square items-center justify-center bg-stone-100 text-stone-400">
                                                    <Camera className="size-6" />
                                                </div>
                                            )}
                                            <div className="min-w-0 space-y-0.5 p-2">
                                                {foto.nota ? (
                                                    <p className="truncate text-xs font-medium text-stone-800">
                                                        {foto.nota}
                                                    </p>
                                                ) : null}
                                                <p className="truncate text-[10px] text-stone-400">
                                                    {formatWhen(foto.created_at)}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    <p className="mt-8 text-center text-xs text-stone-400">{taller.nombre}</p>
                </div>
            </div>

            {preview?.url ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4"
                    onClick={() => setPreview(null)}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                        aria-label="Cerrar"
                        onClick={() => setPreview(null)}
                    >
                        <X className="size-5" />
                    </button>
                    <div
                        className="w-full max-w-4xl overflow-hidden rounded-2xl bg-stone-900 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={preview.url}
                            alt={preview.nota || 'Foto del taller'}
                            className="max-h-[80dvh] w-full object-contain"
                        />
                        {(preview.nota || preview.created_at) && (
                            <div className="space-y-0.5 px-4 py-3 text-sm text-stone-200">
                                {preview.nota ? <p>{preview.nota}</p> : null}
                                <p className="text-xs text-stone-400">
                                    {formatWhen(preview.created_at)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
