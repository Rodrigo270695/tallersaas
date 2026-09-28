import { Camera, Loader2, PackageSearch } from 'lucide-react';
import { useState } from 'react';
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
    onRecepcion,
    onRepuestos,
}: {
    vehiculoId: string;
    sedeId: string;
    sintoma: string;
    onRecepcion: (result: Recepcion) => void;
    onRepuestos: (lineas: IaLinea[]) => void;
}) {
    const [fotos, setFotos] = useState<File[]>([]);
    const [busy, setBusy] = useState<'recepcion' | 'repuestos' | null>(null);

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
            </div>
        </div>
    );
}
