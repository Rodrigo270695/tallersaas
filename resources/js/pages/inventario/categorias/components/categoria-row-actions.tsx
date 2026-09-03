import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CategoriaProducto } from '../types';

export type CategoriaRowActionsProps = {
    categoria: CategoriaProducto;
    onEdit: (categoria: CategoriaProducto) => void;
    onDelete: (categoria: CategoriaProducto) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
};

/**
 * Dropdown de acciones por fila: editar / eliminar.
 */
export function CategoriaRowActions({
    categoria,
    onEdit,
    onDelete,
    canUpdate = true,
    canDelete = true,
}: CategoriaRowActionsProps) {
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
                    aria-label={`Acciones para ${categoria.nombre}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(categoria)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}

                {canDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(categoria)}
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
