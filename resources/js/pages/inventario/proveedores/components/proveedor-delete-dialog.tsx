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
import proveedores from '@/routes/inventario/proveedores';
import type { Proveedor } from '../types';

export function ProveedorDeleteDialog({
    open,
    onOpenChange,
    proveedor,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proveedor: Proveedor | null;
}) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        if (!proveedor) {
            return;
        }

        setProcessing(true);
        router.delete(proveedores.destroy(proveedor.id).url, {
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
                    <DialogTitle className="pt-2 text-base">Eliminar proveedor</DialogTitle>
                    <DialogDescription>
                        ¿Seguro que deseas eliminar a{' '}
                        <strong className="text-foreground">{proveedor?.razon_social}</strong>?
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
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
