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
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import type { OrdenTrabajo } from '../types';

export type OrdenDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orden: OrdenTrabajo | null;
};

export function OrdenDeleteDialog({
    open,
    onOpenChange,
    orden,
}: OrdenDeleteDialogProps) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!orden) {
            return;
        }

        setProcessing(true);
        router.delete(ordenesTrabajo.destroy(orden.id).url, {
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
                        <TriangleAlert
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    </div>
                    <DialogTitle className="pt-2 text-base">
                        Eliminar orden de trabajo
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        ¿Seguro que deseas eliminar{' '}
                        <strong className="text-foreground">{orden?.numero}</strong>?
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
                        {processing && (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        )}
                        {processing ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
