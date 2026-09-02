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
import servicios from '@/routes/taller/servicios';
import type { Servicio } from '../types';

export function ServicioDeleteDialog({
    open,
    onOpenChange,
    servicio,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    servicio: Servicio | null;
}) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!servicio) {
            return;
        }

        setProcessing(true);
        router.delete(servicios.destroy(servicio.id).url, {
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
                        <TriangleAlert className="size-5" strokeWidth={2.5} />
                    </div>
                    <DialogTitle className="pt-2 text-base">Eliminar servicio</DialogTitle>
                    <DialogDescription>
                        ¿Seguro que deseas eliminar{' '}
                        <strong className="text-foreground">{servicio?.nombre}</strong>?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="cursor-pointer gap-2"
                        disabled={processing}
                        onClick={onConfirm}
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
