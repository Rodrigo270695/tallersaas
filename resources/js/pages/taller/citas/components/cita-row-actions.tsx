import { MoreHorizontal, Pencil, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Cita } from '../types';

const ACTIVAS = new Set(['programada', 'confirmada', 'en_recepcion']);

export function CitaRowActions({
    cita,
    onEdit,
    onDelete,
    onConvert,
    canUpdate = true,
    canDelete = true,
    canConvert = false,
}: {
    cita: Cita;
    onEdit: (cita: Cita) => void;
    onDelete: (cita: Cita) => void;
    onConvert?: (cita: Cita) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
    canConvert?: boolean;
}) {
    const puedeConvertir =
        canConvert &&
        Boolean(onConvert) &&
        ACTIVAS.has(cita.estado) &&
        !cita.orden_trabajo_id;

    if (!canUpdate && !canDelete && !puedeConvertir) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Acciones de la cita"
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {puedeConvertir && onConvert && (
                    <DropdownMenuItem
                        onSelect={() => onConvert(cita)}
                        className="cursor-pointer gap-2"
                    >
                        <Wrench className="size-4" strokeWidth={2.25} />
                        Convertir en OT
                    </DropdownMenuItem>
                )}
                {canUpdate && cita.estado !== 'convertida' && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(cita)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}
                {canDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(cita)}
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
