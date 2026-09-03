import { router } from '@inertiajs/react';
import { Camera, Loader2, Link2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormSection } from '@/components/forms';
import { ImageCaptureField } from '@/components/media/image-capture-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toastManager } from '@/lib/toast';
import type { OrdenFoto, OrdenTrabajo } from '../types';

export function OrdenFotosSection({
    orden,
    canUpdate,
}: {
    orden: OrdenTrabajo;
    canUpdate: boolean;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [nota, setNota] = useState('');
    const [uploading, setUploading] = useState(false);
    const fotos = orden.fotos ?? [];
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
        <FormSection
            index={4}
            title="Avance y fotos"
            description="El cliente ve estas fotos en el link de seguimiento."
            icon={Camera}
            columns={1}
        >
            {orden.public_token ? (
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        onClick={copyLink}
                    >
                        <Link2 className="size-3.5" />
                        Copiar link del cliente
                    </Button>
                    <span className="truncate text-xs text-muted-foreground">{seguimientoUrl}</span>
                </div>
            ) : null}

            {fotos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {fotos.map((foto) => (
                        <div
                            key={foto.id}
                            className="overflow-hidden rounded-lg border border-brand-200/60 bg-brand-50/20 dark:border-brand-800/40 dark:bg-brand-950/20"
                        >
                            {foto.url ? (
                                <img
                                    src={foto.url}
                                    alt={foto.nota || 'Foto de avance'}
                                    className="aspect-[4/3] w-full object-cover"
                                />
                            ) : null}
                            <div className="flex items-start justify-between gap-2 p-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm">{foto.nota || 'Sin nota'}</p>
                                    <p className="text-[11px] text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
                    Todavía no hay fotos. Sube el progreso del trabajo para que el cliente lo vea.
                </p>
            )}

            {canUpdate && orden.estado !== 'anulada' ? (
                <div className="grid gap-3 rounded-lg border border-dashed border-brand-200/80 p-3 dark:border-brand-800/50">
                    <ImageCaptureField
                        id={`ot-foto-${orden.id}`}
                        value={file}
                        onChange={setFile}
                        disabled={uploading}
                    />
                    <Input
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="Nota opcional (ej. cambio de pastillas)"
                        disabled={uploading}
                    />
                    <Button
                        type="button"
                        size="sm"
                        className="cursor-pointer gap-1.5 self-start disabled:cursor-not-allowed"
                        disabled={!file || uploading}
                        onClick={upload}
                    >
                        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                        Subir foto de avance
                    </Button>
                </div>
            ) : null}
        </FormSection>
    );
}
