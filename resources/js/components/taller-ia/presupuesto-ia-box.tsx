import { Loader2, Mic, Sparkles, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { postIa, type IaLinea } from '@/lib/taller-ia';
import { toastManager } from '@/lib/toast';

type Resultado = {
    diagnostico: string;
    transcripcion: string;
    lineas: IaLinea[];
};

export function PresupuestoIaBox({
    vehiculoId,
    sedeId,
    onApply,
}: {
    vehiculoId: string;
    sedeId: string;
    onApply: (result: Resultado) => void;
}) {
    const [texto, setTexto] = useState('');
    const [audio, setAudio] = useState<Blob | null>(null);
    const [grabando, setGrabando] = useState(false);
    const [busy, setBusy] = useState(false);
    const recorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

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

    const armar = async () => {
        setBusy(true);

        try {
            const body = new FormData();
            body.set('texto', texto);
            body.set('vehiculo_id', vehiculoId);
            body.set('sede_id', sedeId);
            if (audio) {
                body.set('audio', audio, 'dictado.webm');
            }

            const result = await postIa<Resultado>('/taller/ia/presupuesto', body);
            if (result.transcripcion) {
                setTexto((prev) => (prev.trim() === '' ? result.transcripcion : `${prev.trim()}\n${result.transcripcion}`));
            }
            setAudio(null);
            onApply(result);
            toastManager.success({ title: 'Presupuesto armado. Revísalo antes de guardar.' });
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo armar el presupuesto.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid gap-2 rounded-md border border-dashed p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="size-3.5" />
                Armar con IA
            </p>
            <Textarea
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
                rows={2}
                placeholder="Dicta o escribe: pastillas delanteras, disco rayado, aceite 5w30"
            />
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void toggleMic()} disabled={busy}>
                    {grabando ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}
                    {grabando ? 'Detener' : 'Dictar'}
                </Button>
                <Button type="button" size="sm" className="gap-1.5" onClick={() => void armar()} disabled={busy || grabando}>
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    Armar presupuesto
                </Button>
                {audio ? <span className="self-center text-xs text-muted-foreground">Audio listo</span> : null}
            </div>
        </div>
    );
}
