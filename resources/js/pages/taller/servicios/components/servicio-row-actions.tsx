import { MoreHorizontal, Package, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Servicio } from '../types';

export type ServicioRowActionsProps = {
    servicio: Servicio;
    onEdit: (servicio: Servicio) => void;
    onKit: (servicio: Servicio) => void;
    onDelete: (servicio: Servicio) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
};

export function ServicioRowActions({
    servicio,
    onEdit,
    onKit,
    onDelete,
    canUpdate = true,
    canDelete = true,
}: ServicioRowActionsProps) {
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
                    aria-label={`Acciones para ${servicio.nombre}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(servicio)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}
                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onKit(servicio)}
                        className="cursor-pointer gap-2"
                    >
                        <Package className="size-4" strokeWidth={2.25} />
                        Kit
                    </DropdownMenuItem>
                )}
                {canDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(servicio)}
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
