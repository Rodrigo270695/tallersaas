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
import clientes from '@/routes/taller/clientes';
import type { Cliente } from '../types';

export type ClienteDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cliente: Cliente | null;
};

/**
 * Diálogo de confirmación para eliminar un cliente.
 * Hace soft delete vía DELETE a `taller.clientes.destroy`.
 */
export function ClienteDeleteDialog({
    open,
    onOpenChange,
    cliente,
}: ClienteDeleteDialogProps) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!cliente) {
            return;
        }

        setProcessing(true);
        router.delete(clientes.destroy(cliente.id).url, {
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
                        Eliminar cliente
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        ¿Seguro que deseas eliminar a{' '}
                        <strong className="text-foreground">
                            {cliente?.nombres} {cliente?.apellidos}
                        </strong>
                        ? Esta acción se puede revertir desde soporte.
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
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {processing ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
