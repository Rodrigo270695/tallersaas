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
import compras from '@/routes/inventario/compras';
import type { Compra } from '../types';

export function CompraAnularDialog({
    open,
    onOpenChange,
    compra,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    compra: Compra | null;
}) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!compra) {
            return;
        }

        setProcessing(true);
        router.delete(compras.destroy(compra.id).url, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    const referencia = compra
        ? [compra.serie, compra.numero_documento].filter(Boolean).join('-') || 'sin número'
        : '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <TriangleAlert className="size-5" strokeWidth={2.5} />
                    </div>
                    <DialogTitle className="pt-2 text-base">Anular compra</DialogTitle>
                    <DialogDescription>
                        ¿Seguro que deseas anular la compra{' '}
                        <strong className="text-foreground">{referencia}</strong>? Se
                        registrará una salida de inventario por la misma cantidad que ingresó.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
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
                        Anular compra
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
