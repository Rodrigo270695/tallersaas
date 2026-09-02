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
import usuarios from '@/routes/configuracion/usuarios';

export type UserBulkDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ids: string[];
    onCompleted?: () => void;
};

export function UserBulkDeleteDialog({
    open,
    onOpenChange,
    ids,
    onCompleted,
}: UserBulkDeleteDialogProps) {
    const [processing, setProcessing] = useState(false);
    const count = ids.length;

    const onConfirm = () => {
        if (count === 0) {
            return;
        }

        setProcessing(true);
        router.delete(usuarios.bulkDestroy().url, {
            data: { ids },
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                onCompleted?.();
                onOpenChange(false);
            },
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
                        Eliminar {count}{' '}
                        {count === 1 ? 'usuario' : 'usuarios'}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Tu propia cuenta y los superadmins se omitirán
                        automáticamente.
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
                        disabled={processing || count === 0}
                        className="cursor-pointer gap-2"
                    >
                        {processing && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {count === 1
                            ? 'Eliminar 1 usuario'
                            : `Eliminar ${count} usuarios`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
