import { router } from '@inertiajs/react';
import { Camera, Loader2, Mic, PackageSearch, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { postIa, type IaLinea } from '@/lib/taller-ia';
import { toastManager } from '@/lib/toast';

type Recepcion = {
    solicitud_cliente: string;
    diagnostico: string;
    danos: string[];
};

export function OrdenIaBox({
    vehiculoId,
    sedeId,
    sintoma,
    clienteId,
    auto,
    onRecepcion,
    onRepuestos,
    onNota,
}: {
    vehiculoId: string;
    sedeId: string;
    sintoma: string;
    clienteId: string;
    auto: string;
    onRecepcion: (result: Recepcion) => void;
    onRepuestos: (lineas: IaLinea[]) => void;
    onNota: (nota: string) => void;
}) {
    const [fotos, setFotos] = useState<File[]>([]);
    const [busy, setBusy] = useState<'recepcion' | 'repuestos' | 'nota' | null>(null);
    const [grabando, setGrabando] = useState(false);
    const [audio, setAudio] = useState<Blob | null>(null);
    const [mensajeCliente, setMensajeCliente] = useState('');
    const recorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

    const recepcion = async () => {
        setBusy('recepcion');

        try {
            const body = new FormData();
            body.set('solicitud', sintoma);
            body.set('vehiculo_id', vehiculoId);
            fotos.forEach((foto) => body.append('fotos[]', foto));
            const result = await postIa<Recepcion>('/taller/ia/recepcion', body);
            onRecepcion(result);
            toastManager.success({ title: 'Recepción redactada. Revísala antes de guardar.' });
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo redactar la recepción.' });
        } finally {
            setBusy(null);
        }
    };

    const repuestos = async () => {
        setBusy('repuestos');

        try {
            const body = new FormData();
            body.set('sintoma', sintoma);
            body.set('vehiculo_id', vehiculoId);
            body.set('sede_id', sedeId);
            const result = await postIa<{ lineas: IaLinea[] }>('/taller/ia/repuestos', body);
            onRepuestos(result.lineas);
            toastManager.success({ title: 'Repuestos sugeridos. Lo que no hay en stock queda marcado para comprar.' });
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudieron sugerir repuestos.' });
        } finally {
            setBusy(null);
        }
    };

    const toggleMic = async () => {
        if (grabando) {
            recorder.current?.stop();

            return;
        }

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            toastManager.error({ title: 'Este navegador no puede grabar audio.' });

            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const media = new MediaRecorder(stream);
            chunks.current = [];
            media.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.current.push(event.data);
                }
            };
            media.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                setAudio(new Blob(chunks.current, { type: media.mimeType || 'audio/webm' }));
                setGrabando(false);
            };
            recorder.current = media;
            media.start();
            setGrabando(true);
        } catch {
            toastManager.error({ title: 'No se pudo usar el micrófono.' });
        }
    };

    const nota = async () => {
        setBusy('nota');

        try {
            const body = new FormData();
            body.set('auto', auto);
            body.set('texto', sintoma);
            if (audio) {
                body.set('audio', audio, 'mecanico.webm');
            }
            const result = await postIa<{ nota_interna: string; mensaje_cliente: string }>('/taller/ia/nota-mecanico', body);
            onNota(result.nota_interna);
            setMensajeCliente(result.mensaje_cliente);
            setAudio(null);
            toastManager.success({ title: 'Nota lista. Revísala antes de guardar la orden.' });
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo armar la nota.' });
        } finally {
            setBusy(null);
        }
    };

    const enviarNota = () => {
        if (clienteId === '' || mensajeCliente.trim() === '') {
            return;
        }

        router.post(
            '/taller/ia/enviar',
            {
                cliente_id: clienteId,
                cuerpo: mensajeCliente,
                tipo: 'nota_mecanico',
                referencia_id: clienteId,
                dedupe_key: `nota:${clienteId}:${new Date().toISOString().slice(0, 13)}`,
            },
            { preserveScroll: true },
        );
    };

    return (
        <div className="grid gap-2 rounded-md border border-dashed p-3 sm:col-span-2">
            <p className="text-sm font-medium">IA en la orden</p>
            <label className="grid gap-1 text-xs text-muted-foreground">
                Fotos del auto al ingresar
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="text-sm text-foreground"
                    onChange={(event) => setFotos(Array.from(event.target.files ?? []).slice(0, 4))}
                />
            </label>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => void recepcion()}>
                    {busy === 'recepcion' ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                    Redactar recepción
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy !== null || sintoma.trim() === ''} onClick={() => void repuestos()}>
                    {busy === 'repuestos' ? <Loader2 className="size-3.5 animate-spin" /> : <PackageSearch className="size-3.5" />}
                    Sugerir repuestos
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => void toggleMic()}>
                    {grabando ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}
                    {grabando ? 'Detener' : 'Dictar al mecánico'}
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy !== null || grabando || (audio === null && sintoma.trim() === '')} onClick={() => void nota()}>
                    {busy === 'nota' ? <Loader2 className="size-3.5 animate-spin" /> : <Mic className="size-3.5" />}
                    Armar nota
                </Button>
            </div>
            {mensajeCliente !== '' ? (
                <div className="grid gap-2">
                    <p className="text-sm">{mensajeCliente}</p>
                    <Button type="button" size="sm" className="w-fit" disabled={clienteId === ''} onClick={enviarNota}>
                        Enviar al cliente
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
