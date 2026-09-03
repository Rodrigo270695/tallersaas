import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import unidadesMedida from '@/routes/plataforma/unidades-medida';
import type { UnidadMedida } from '../types';

export function UnidadMedidaDeleteDialog({
    open,
    onOpenChange,
    unidad,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unidad: UnidadMedida | null;
}) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!unidad) {
            return;
        }

        setProcessing(true);
        router.delete(unidadesMedida.destroy(unidad.id).url, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar unidad</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Eliminar <strong>{unidad?.codigo}</strong>
                        {unidad?.nombre ? ` (${unidad.nombre})` : ''}? Los talleres ya no
                        podrán elegirla en repuestos nuevos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={processing} className="cursor-pointer">
                        Cancelar
                    </AlertDialogCancel>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={processing || !unidad}
                        onClick={onConfirm}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Eliminar
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
