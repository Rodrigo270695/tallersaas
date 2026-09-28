import { Camera, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { postIa } from '@/lib/taller-ia';
import { toastManager } from '@/lib/toast';

export function OdometroButton({ onKm }: { onKm: (km: number) => void }) {
    const [busy, setBusy] = useState(false);

    const leer = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        setBusy(true);

        try {
            const body = new FormData();
            body.set('foto', file);
            const result = await postIa<{ km: number }>('/taller/ia/odometro', body);
            onKm(result.km);
            toastManager.success({ title: `Kilometraje leído: ${result.km}` });
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo leer el tablero.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            Foto del tablero
            <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                    void leer(event.target.files?.[0]);
                    event.target.value = '';
                }}
            />
            <Button type="button" variant="outline" size="sm" className="pointer-events-none h-7" tabIndex={-1}>
                Leer km
            </Button>
        </label>
    );
}
