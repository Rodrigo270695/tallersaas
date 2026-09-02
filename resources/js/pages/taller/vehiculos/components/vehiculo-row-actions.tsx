import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Vehiculo } from '../types';

export type VehiculoRowActionsProps = {
    vehiculo: Vehiculo;
    onEdit: (vehiculo: Vehiculo) => void;
    onDelete: (vehiculo: Vehiculo) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
};

/**
 * Dropdown de acciones por fila: editar / eliminar.
 */
export function VehiculoRowActions({
    vehiculo,
    onEdit,
    onDelete,
    canUpdate = true,
    canDelete = true,
}: VehiculoRowActionsProps) {
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
                    aria-label={`Acciones para ${vehiculo.placa}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(vehiculo)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}

                {canDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(vehiculo)}
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
