import { router } from '@inertiajs/react';
import { Loader2, Lock, TriangleAlert } from 'lucide-react';
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
import roles from '@/routes/configuracion/roles';
import type { Role } from '../types';

export type RoleDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
};

export function RoleDeleteDialog({
    open,
    onOpenChange,
    role,
}: RoleDeleteDialogProps) {
    const [processing, setProcessing] = useState(false);
    const isSystem = role?.is_system === true;

    const onConfirm = () => {
        if (!role || isSystem) {
            return;
        }

        setProcessing(true);
        router.delete(roles.destroy(role.id).url, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div
                        className={
                            isSystem
                                ? 'flex size-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive'
                        }
                    >
                        {isSystem ? (
                            <Lock
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        ) : (
                            <TriangleAlert
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        )}
                    </div>
                    <DialogTitle className="pt-2 text-base">
                        Eliminar rol
                    </DialogTitle>
                    <DialogDescription className="text-sm" asChild>
                        {isSystem ? (
                            <p>
                                Este rol es del sistema y no se puede eliminar.
                            </p>
                        ) : (
                            <p>
                                ¿Seguro que deseas eliminar el rol{' '}
                                <strong className="text-foreground">
                                    {role?.name}
                                </strong>
                                ? Los usuarios que lo tenían quedarán sin rol
                                asignado.
                            </p>
                        )}
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
                    {!isSystem && (
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
                            {processing ? 'Eliminando…' : 'Sí, eliminar'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
