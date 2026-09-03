import { FileText, MoreHorizontal, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Compra } from '../types';

export type CompraRowActionsProps = {
    compra: Compra;
    onAnular: (compra: Compra) => void;
    canDelete?: boolean;
};

export function CompraRowActions({ compra, onAnular, canDelete = true }: CompraRowActionsProps) {
    const isAnulada = compra.deleted_at !== null;
    const hasFactura = compra.factura_url !== null;

    if (!canDelete && !hasFactura) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Acciones de la compra"
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {hasFactura && (
                    <DropdownMenuItem asChild className="cursor-pointer gap-2">
                        <a href={compra.factura_url ?? '#'} target="_blank" rel="noreferrer">
                            <FileText className="size-4" strokeWidth={2.25} />
                            Ver comprobante
                        </a>
                    </DropdownMenuItem>
                )}
                {canDelete && !isAnulada && (
                    <DropdownMenuItem
                        onSelect={() => onAnular(compra)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                        <Ban className="size-4" strokeWidth={2.25} />
                        Anular
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
