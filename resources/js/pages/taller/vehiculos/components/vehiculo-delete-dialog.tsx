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
import vehiculos from '@/routes/taller/vehiculos';
import type { Vehiculo } from '../types';

export type VehiculoDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehiculo: Vehiculo | null;
};

/**
 * Diálogo de confirmación para eliminar un vehículo.
 * Hace soft delete vía DELETE a `taller.vehiculos.destroy`.
 */
export function VehiculoDeleteDialog({
    open,
    onOpenChange,
    vehiculo,
}: VehiculoDeleteDialogProps) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!vehiculo) {
            return;
        }

        setProcessing(true);
        router.delete(vehiculos.destroy(vehiculo.id).url, {
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
                        Eliminar vehículo
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        ¿Seguro que deseas eliminar el vehículo{' '}
                        <strong className="text-foreground">
                            {vehiculo?.placa}
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
