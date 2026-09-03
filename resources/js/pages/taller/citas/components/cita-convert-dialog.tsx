import { router } from '@inertiajs/react';
import { Loader2, Wrench } from 'lucide-react';
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
import citas from '@/routes/taller/citas';
import type { Cita } from '../types';

export function CitaConvertDialog({
    open,
    onOpenChange,
    cita,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cita: Cita | null;
}) {
    const [processing, setProcessing] = useState(false);
    const placa = cita?.vehiculo?.placa ?? 'el vehículo';
    const cliente = cita?.cliente
        ? `${cita.cliente.nombres} ${cita.cliente.apellidos ?? ''}`.trim()
        : 'el cliente';

    const onConfirm = () => {
        if (!cita) {
            return;
        }

        setProcessing(true);
        router.post(citas.convertir(cita.id).url, {}, {
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Wrench className="size-5" strokeWidth={2.5} aria-hidden="true" />
                    </div>
                    <DialogTitle className="pt-2 text-base">Convertir en orden de trabajo</DialogTitle>
                    <DialogDescription className="text-sm">
                        Se abrirá una OT para <strong className="text-foreground">{placa}</strong> de{' '}
                        <strong className="text-foreground">{cliente}</strong>. La cita quedará
                        marcada como convertida.
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
                        onClick={onConfirm}
                        disabled={processing}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {processing ? 'Convirtiendo…' : 'Crear orden'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
