import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Cliente } from '../types';

export type ClienteRowActionsProps = {
    cliente: Cliente;
    onEdit: (cliente: Cliente) => void;
    onDelete: (cliente: Cliente) => void;
    /** Si false, no se renderiza la opción "Editar". */
    canUpdate?: boolean;
    /** Si false, no se renderiza la opción "Eliminar". */
    canDelete?: boolean;
};

/**
 * Dropdown de acciones por fila: editar / eliminar.
 */
export function ClienteRowActions({
    cliente,
    onEdit,
    onDelete,
    canUpdate = true,
    canDelete = true,
}: ClienteRowActionsProps) {
    if (!canUpdate && !canDelete) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Acciones para ${cliente.nombres}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(cliente)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}

                {canDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(cliente)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                        <Trash2 className="size-4" strokeWidth={2.25} />
                        Eliminar
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
