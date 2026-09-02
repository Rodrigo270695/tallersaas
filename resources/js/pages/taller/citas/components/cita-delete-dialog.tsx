import { router } from '@inertiajs/react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import citas from '@/routes/taller/citas';
import type { Cita } from '../types';

export function CitaDeleteDialog({
    open,
    onOpenChange,
    cita,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cita: Cita | null;
}) {
    const [processing, setProcessing] = useState(false);
    const placa = cita?.vehiculo?.placa ?? 'esta cita';

    const onConfirm = () => {
        if (!cita) {
            return;
        }

        setProcessing(true);
        router.delete(citas.destroy(cita.id).url, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <TriangleAlert className="size-5" strokeWidth={2.5} aria-hidden="true" />
                    </div>
                    <DialogTitle className="pt-2 text-base">Eliminar cita</DialogTitle>
                    <DialogDescription className="text-sm">
                        ¿Seguro que deseas eliminar la cita de{' '}
                        <strong className="text-foreground">{placa}</strong>?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={processing}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {processing ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
