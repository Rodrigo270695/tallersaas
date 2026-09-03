import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Proveedor } from '../types';

export type ProveedorRowActionsProps = {
    proveedor: Proveedor;
    onEdit: (proveedor: Proveedor) => void;
    onDelete: (proveedor: Proveedor) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
};

export function ProveedorRowActions({
    proveedor,
    onEdit,
    onDelete,
    canUpdate = true,
    canDelete = true,
}: ProveedorRowActionsProps) {
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
                    aria-label={`Acciones para ${proveedor.razon_social}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(proveedor)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}
                {canDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(proveedor)}
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
