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
import usuarios from '@/routes/configuracion/usuarios';
import type { User } from '../types';

export type UserDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    currentUserId: string | null;
};

export function UserDeleteDialog({
    open,
    onOpenChange,
    user,
    currentUserId,
}: UserDeleteDialogProps) {
    const [processing, setProcessing] = useState(false);

    const isSelf = user !== null && currentUserId === user.id;
    const isSuperadmin =
        user !== null && user.roles.some((r) => r.name === 'superadmin');
    const isProtected = isSelf || isSuperadmin;

    const onConfirm = () => {
        if (!user || isProtected) {
            return;
        }

        setProcessing(true);
        router.delete(usuarios.destroy(user.id).url, {
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
                            isProtected
                                ? 'flex size-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive'
                        }
                    >
                        {isProtected ? (
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
                        Eliminar usuario
                    </DialogTitle>
                    <DialogDescription className="text-sm" asChild>
                        {isProtected ? (
                            <p>
                                {isSelf
                                    ? 'No puedes eliminar tu propia cuenta.'
                                    : 'El superadmin no se puede eliminar desde el panel.'}
                            </p>
                        ) : (
                            <p>
                                ¿Seguro que deseas eliminar a{' '}
                                <strong className="text-foreground">
                                    {user?.name}
                                </strong>
                                ? Esta acción se puede revertir desde soporte.
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
                    {!isProtected && (
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
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
