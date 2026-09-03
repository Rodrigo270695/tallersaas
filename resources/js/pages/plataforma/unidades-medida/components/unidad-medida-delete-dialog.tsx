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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TriangleAlert className="size-5 text-destructive" />
                        Eliminar unidad
                    </DialogTitle>
                    <DialogDescription>
                        ¿Eliminar <strong>{unidad?.codigo}</strong>
                        {unidad?.nombre ? ` (${unidad.nombre})` : ''}? Los talleres ya no
                        podrán elegirla en repuestos nuevos.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={processing}
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
