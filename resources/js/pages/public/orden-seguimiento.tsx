import { Head } from '@inertiajs/react';
import { CheckCircle2, Circle } from 'lucide-react';

type TimelineStep = {
    key: string;
    label: string;
    at: string | null;
    done: boolean;
};

type Foto = {
    id: string;
    url: string | null;
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

const estadoLabel: Record<string, string> = {
    abierta: 'Recepcionada',
    en_proceso: 'En taller',
    lista: 'Lista para recoger',
    entregada: 'Entregada',
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
    return (
        <>
            <Head title={`Seguimiento ${orden.numero}`} />

            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4">
                <div className="space-y-2 text-center">
                    {taller.logo_url ? (
                        <img
                            src={taller.logo_url}
                            alt={taller.nombre}
                            className="mx-auto h-12 w-auto object-contain"
                        />
                    ) : (
                        <p className="text-sm font-medium text-brand-700">{taller.nombre}</p>
                    )}
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Seguimiento {orden.numero}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {orden.cliente_nombre ?? 'Cliente'} · {orden.vehiculo_label}
                    </p>
                    <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200/70">
                        {estadoLabel[orden.estado] ?? orden.estado}
                    </p>
                </div>

                <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold">Estado del trabajo</h2>
                    <ol className="space-y-3">
                        {orden.timeline.map((step) => (
                            <li key={step.key} className="flex items-start gap-3">
                                {step.done ? (
                                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" />
                                ) : (
                                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/50" />
                                )}
                                <div className="min-w-0">
                                    <p
                                        className={
                                            step.done
                                                ? 'text-sm font-medium'
                                                : 'text-sm text-muted-foreground'
                                        }
                                    >
                                        {step.label}
                                    </p>
                                    {step.done && step.at ? (
                                        <p className="text-xs text-muted-foreground">
                                            {formatWhen(step.at)}
                                        </p>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                {orden.solicitud_cliente ? (
                    <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                        <h2 className="mb-2 text-sm font-semibold">Solicitud</h2>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {orden.solicitud_cliente}
                        </p>
                    </section>
                ) : null}

                <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold">Fotos del avance</h2>
                    {fotos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Aún no hay fotos del proceso. El taller las irá publicando aquí.
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {fotos.map((foto) => (
                                <figure
                                    key={foto.id}
                                    className="overflow-hidden rounded-lg border border-border/60 bg-muted/30"
                                >
                                    {foto.url ? (
                                        <img
                                            src={foto.url}
                                            alt={foto.nota || 'Avance del taller'}
                                            className="aspect-[4/3] w-full object-cover"
                                        />
                                    ) : null}
                                    <figcaption className="space-y-0.5 p-2.5">
                                        {foto.nota ? (
                                            <p className="text-sm">{foto.nota}</p>
                                        ) : null}
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatWhen(foto.created_at)}
                                        </p>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    )}
                </section>

                {taller.telefono ? (
                    <p className="text-center text-xs text-muted-foreground">
                        ¿Dudas? Llama o escribe al taller: {taller.telefono}
                    </p>
                ) : null}
            </div>
        </>
    );
}
