import { Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { postIa } from '@/lib/taller-ia';
import { toastManager } from '@/lib/toast';

export function SiniestroIaBox({
    orden,
    placa,
    aseguradora,
    numero,
    cobertura,
    monto,
    notas,
    onInforme,
}: {
    orden: string;
    placa: string;
    aseguradora: string;
    numero: string;
    cobertura: string;
    monto: string;
    notas: string;
    onInforme: (informe: string) => void;
}) {
    const [fotos, setFotos] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);

    const redactar = async () => {
        setBusy(true);

        try {
            const body = new FormData();
            body.set('orden', orden);
            body.set('placa', placa);
            body.set('aseguradora', aseguradora);
            body.set('numero', numero);
            body.set('cobertura', cobertura);
            body.set('monto', monto);
            body.set('notas', notas);
            fotos.forEach((foto) => body.append('fotos[]', foto));
            const result = await postIa<{ informe: string }>('/taller/ia/siniestro', body);
            onInforme(result.informe);
            toastManager.success({ title: 'Informe listo. Revísalo antes de guardar.' });
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo redactar el informe.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid gap-2 rounded-md border border-dashed p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium">
                <ShieldAlert className="size-3.5" />
                Informe para la aseguradora
            </p>
            <label className="grid gap-1 text-xs text-muted-foreground">
                Fotos del choque
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="text-sm text-foreground"
                    onChange={(event) => setFotos(Array.from(event.target.files ?? []).slice(0, 4))}
                />
            </label>
            <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" disabled={busy} onClick={() => void redactar()}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldAlert className="size-3.5" />}
                Redactar informe
            </Button>
        </div>
    );
}
