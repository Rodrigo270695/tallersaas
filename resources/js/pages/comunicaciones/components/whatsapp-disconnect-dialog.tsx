import { router } from '@inertiajs/react';
import { Loader2, LogOut } from 'lucide-react';
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

export function WhatsAppDisconnectDialog({
    open,
    onOpenChange,
    phone,
    logoutUrl = '/comunicaciones/whatsapp/logout',
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    phone: string | null;
    logoutUrl?: string;
    onSuccess?: () => void;
}) {
    const [processing, setProcessing] = useState(false);

    const onConfirm = () => {
        setProcessing(true);
        router.post(
            logoutUrl,
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    onOpenChange(false);
                    onSuccess?.();
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <LogOut className="size-5" strokeWidth={2.5} />
                    </div>
                    <DialogTitle className="pt-2 text-base">Cerrar sesión de WhatsApp</DialogTitle>
                    <DialogDescription className="text-sm">
                        El taller dejará de enviar avisos automáticos hasta que vincules otro número.
                        {phone ? (
                            <span className="mt-2 block font-medium text-foreground">{phone}</span>
                        ) : null}
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
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Cerrar sesión
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
