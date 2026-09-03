import { Package } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type ProductoFotoCellProps = {
    fotoUrl: string | null;
    etiqueta: string;
};

/**
 * Miniatura de foto en la tabla de repuestos. Sin foto → placeholder;
 * con foto → click abre dialog ampliado.
 */
export function ProductoFotoCell({ fotoUrl, etiqueta }: ProductoFotoCellProps) {
    const [open, setOpen] = useState(false);

    if (!fotoUrl) {
        return (
            <span
                className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground"
                title="Sin foto"
            >
                <Package className="size-4 opacity-60" aria-hidden />
                <span className="sr-only">Sin foto</span>
            </span>
        );
    }

    return (
        <>
            <button
                type="button"
                className="group relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border bg-muted/20 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setOpen(true)}
                title="Ver foto en grande"
            >
                <img
                    src={fotoUrl}
                    alt=""
                    className="size-full object-cover transition group-hover:opacity-90"
                />
                <span className="sr-only">Ver foto en grande: {etiqueta}</span>
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{etiqueta}</DialogTitle>
                        <DialogDescription className="sr-only">
                            Vista ampliada de la foto del repuesto
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex max-h-[min(70vh,560px)] justify-center overflow-auto rounded-md bg-muted/30 p-2">
                        <img
                            src={fotoUrl}
                            alt={etiqueta}
                            className="max-h-full w-auto max-w-full object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
