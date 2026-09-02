import { router } from '@inertiajs/react';
import { Banknote, FileText, MessageCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import type { OrdenTrabajo } from '../types';

export type OrdenRowActionsProps = {
    orden: OrdenTrabajo;
    onEdit: (orden: OrdenTrabajo) => void;
    onDelete: (orden: OrdenTrabajo) => void;
    onCobrar?: (orden: OrdenTrabajo) => void;
    onAvisar?: (orden: OrdenTrabajo) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
    canCobrar?: boolean;
    canPresupuesto?: boolean;
};

export function OrdenRowActions({
    orden,
    onEdit,
    onDelete,
    onCobrar,
    onAvisar,
    canUpdate = true,
    canDelete = true,
    canCobrar = false,
    canPresupuesto = false,
}: OrdenRowActionsProps) {
    const puedeCobrar = canCobrar && orden.estado !== 'anulada';
    const puedePresupuesto = canPresupuesto && orden.estado !== 'anulada';
    const puedeAvisar =
        canUpdate &&
        onAvisar !== undefined &&
        (orden.estado === 'lista' || orden.estado === 'entregada');

    if (!canUpdate && !canDelete && !puedeCobrar && !puedePresupuesto) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Acciones para ${orden.numero}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {puedeAvisar && (
                    <DropdownMenuItem
                        onSelect={() => onAvisar(orden)}
                        className="cursor-pointer gap-2"
                    >
                        <MessageCircle className="size-4" strokeWidth={2.25} />
                        {orden.lista_notificada_at ? 'Reenviar WhatsApp' : 'Avisar por WhatsApp'}
                    </DropdownMenuItem>
                )}

                {puedeCobrar && onCobrar && (
                    <DropdownMenuItem
                        onSelect={() => onCobrar(orden)}
                        className="cursor-pointer gap-2"
                    >
                        <Banknote className="size-4" strokeWidth={2.25} />
                        Cobrar
                    </DropdownMenuItem>
                )}

                {puedePresupuesto && (
                    <DropdownMenuItem
                        onSelect={() =>
                            router.post(ordenesTrabajo.presupuesto(orden.id).url, {}, { preserveScroll: true })
                        }
                        className="cursor-pointer gap-2"
                    >
                        <FileText className="size-4" strokeWidth={2.25} />
                        Crear presupuesto
                    </DropdownMenuItem>
                )}

                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(orden)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}

                {canDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(orden)}
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
