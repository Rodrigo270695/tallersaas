import { router } from '@inertiajs/react';
import { Camera, Link2, Loader2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ImageCaptureField } from '@/components/media/image-capture-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { OrdenFoto, OrdenFotoEtapa, OrdenEstado, OrdenTrabajo } from '../types';

const ETAPAS: {
    value: OrdenFotoEtapa;
    label: string;
    short: string;
    hint: string;
}[] = [
    {
        value: 'ingreso',
        label: 'Ingreso',
        short: 'Ingreso',
        hint: 'Cómo llegó el vehículo al taller.',
    },
    {
        value: 'proceso',
        label: 'Proceso',
        short: 'Proceso',
        hint: 'Avance del trabajo mientras está en taller.',
    },
    {
        value: 'entrega',
        label: 'Entrega',
        short: 'Entrega',
        hint: 'Cómo se entrega o sale el vehículo.',
    },
];

const defaultEtapa = (estado: OrdenEstado): OrdenFotoEtapa => {
    if (estado === 'abierta') {
        return 'ingreso';
    }

    if (estado === 'lista' || estado === 'entregada') {
        return 'entrega';
    }

    return 'proceso';
};

export function OrdenFotosSection({
    orden,
    canUpdate,
    embedded = false,
}: {
    orden: OrdenTrabajo;
    canUpdate: boolean;
    /** Sin card/título extra cuando ya está en pestaña Fotos. */
    embedded?: boolean;
}) {
    const [etapa, setEtapa] = useState<OrdenFotoEtapa>(() => defaultEtapa(orden.estado));
    const [file, setFile] = useState<File | null>(null);
    const [nota, setNota] = useState('');
    const [uploading, setUploading] = useState(false);

    const fotos = orden.fotos ?? [];
    const counts = useMemo(() => {
        const map: Record<OrdenFotoEtapa, number> = { ingreso: 0, proceso: 0, entrega: 0 };
        for (const foto of fotos) {
            const key = (foto.etapa ?? 'proceso') as OrdenFotoEtapa;
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

    const etapaMeta = ETAPAS.find((e) => e.value === etapa) ?? ETAPAS[1];
    const seguimientoUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}/ot/${orden.public_token}`
            : `/ot/${orden.public_token}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(seguimientoUrl);
            toastManager.success({ title: 'Link de seguimiento copiado.' });
        } catch {
            toastManager.error({ title: 'No se pudo copiar el link.' });
        }
    };

    const upload = () => {
        if (!file || !canUpdate) {
            return;
        }

        const body = new FormData();
        body.append('foto', file);
        body.append('etapa', etapa);
        if (nota.trim()) {
            body.append('nota', nota.trim());
        }

        setUploading(true);
        router.post(`/taller/ordenes-trabajo/${orden.id}/fotos`, body, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
            onSuccess: () => {
                setFile(null);
                setNota('');
            },
        });
    };

    const removeFoto = (foto: OrdenFoto) => {
        if (!canUpdate) {
            return;
        }

        router.delete(`/taller/ordenes-trabajo/${orden.id}/fotos/${foto.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className={cn('flex flex-col gap-4', !embedded && 'rounded-xl border bg-card p-4')}>
            {!embedded ? (
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                        <Camera className="size-4 text-brand-600" />
                        Fotos por etapa
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        El cliente las ve agrupadas en el link de seguimiento.
                    </p>
                </div>
            ) : null}

            {orden.public_token ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full cursor-pointer gap-2 sm:w-auto"
                    onClick={() => void copyLink()}
                >
                    <Link2 className="size-4" />
                    Copiar link del cliente
                </Button>
            ) : null}

            <div
                role="tablist"
                aria-label="Etapa de la foto"
                className="grid grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1"
            >
                {ETAPAS.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={etapa === item.value}
                        className={cn(
                            'flex min-h-11 flex-col items-center justify-center rounded-lg px-1 py-2 text-center transition-colors cursor-pointer',
                            etapa === item.value
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground',
                        )}
                        onClick={() => setEtapa(item.value)}
                    >
                        <span className="text-xs font-semibold sm:text-sm">{item.short}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                            {counts[item.value]}
                        </span>
                    </button>
                ))}
            </div>

            <p className="text-xs text-muted-foreground">{etapaMeta.hint}</p>

            {fotosEtapa.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {fotosEtapa.map((foto) => (
                        <div
                            key={foto.id}
                            className="overflow-hidden rounded-xl border bg-muted/20"
                        >
                            {foto.url ? (
                                <img
                                    src={foto.url}
                                    alt={foto.nota || `Foto ${etapa}`}
                                    className="aspect-square w-full object-cover"
                                />
                            ) : null}
                            <div className="flex items-start justify-between gap-1 p-2">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-medium">
                                        {foto.nota || 'Sin nota'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {foto.created_at
                                            ? new Date(foto.created_at).toLocaleString('es-PE', {
                                                  dateStyle: 'short',
                                                  timeStyle: 'short',
                                              })
                                            : ''}
                                    </p>
                                </div>
                                {canUpdate ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0 cursor-pointer text-destructive"
                                        aria-label="Eliminar foto"
                                        onClick={() => removeFoto(foto)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed px-3 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Sin fotos de {etapaMeta.label.toLowerCase()}.
                    </p>
                </div>
            )}

            {canUpdate && orden.estado !== 'anulada' ? (
                <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-3 rounded-xl border bg-background p-3 shadow-md sm:static sm:bottom-auto sm:shadow-none lg:bottom-4">
                    <p className="text-sm font-medium">
                        Subir foto · {etapaMeta.label}
                    </p>
                    <ImageCaptureField
                        id={`ot-foto-${orden.id}-${etapa}`}
                        value={file}
                        onChange={setFile}
                        disabled={uploading}
                    />
                    <Input
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="Nota corta (opcional)"
                        disabled={uploading}
                        className="h-11"
                    />
                    <Button
                        type="button"
                        className="h-11 w-full cursor-pointer gap-2 disabled:cursor-not-allowed"
                        disabled={!file || uploading}
                        onClick={upload}
                    >
                        {uploading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Camera className="size-4" />
                        )}
                        Subir {etapaMeta.label.toLowerCase()}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
