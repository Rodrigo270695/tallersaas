import { Check, Copy, FileCheck2, MoreHorizontal, Pencil, Send, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Presupuesto } from '../types';

export function PresupuestoRowActions({
    presupuesto,
    onEdit,
    onDelete,
    onEnviar,
    onAprobar,
    onRechazar,
    onAplicar,
    onCopiarLink,
    canUpdate = false,
    canDelete = false,
    canEnviar = false,
    canAprobar = false,
}: {
    presupuesto: Presupuesto;
    onEdit: (presupuesto: Presupuesto) => void;
    onDelete: (presupuesto: Presupuesto) => void;
    onEnviar: (presupuesto: Presupuesto) => void;
    onAprobar: (presupuesto: Presupuesto) => void;
    onRechazar: (presupuesto: Presupuesto) => void;
    onAplicar: (presupuesto: Presupuesto) => void;
    onCopiarLink: (presupuesto: Presupuesto) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
    canEnviar?: boolean;
    canAprobar?: boolean;
}) {
    const editable = canUpdate && ['borrador', 'enviado'].includes(presupuesto.estado);
    const puedeEnviar =
        canEnviar && ['borrador', 'enviado'].includes(presupuesto.estado) && Number(presupuesto.total) > 0;
    const puedeAprobarInterno = canAprobar && presupuesto.estado === 'enviado';
    const puedeAplicar =
        canAprobar &&
        presupuesto.estado === 'aprobado' &&
        presupuesto.orden_trabajo_id !== null &&
        presupuesto.convertido_at === null;
    const puedeEliminar =
        canDelete && ['borrador', 'rechazado', 'vencido'].includes(presupuesto.estado);

    if (!editable && !puedeEnviar && !puedeAprobarInterno && !puedeAplicar && !puedeEliminar) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 cursor-pointer"
                aria-label="Copiar enlace"
                onClick={() => onCopiarLink(presupuesto)}
            >
                <Copy className="size-4" />
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Acciones para ${presupuesto.numero}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {puedeEnviar && (
                    <DropdownMenuItem onSelect={() => onEnviar(presupuesto)} className="cursor-pointer gap-2">
                        <Send className="size-4" />
                        Enviar por WhatsApp
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => onCopiarLink(presupuesto)} className="cursor-pointer gap-2">
                    <Copy className="size-4" />
                    Copiar enlace
                </DropdownMenuItem>
                {puedeAprobarInterno && (
                    <DropdownMenuItem onSelect={() => onAprobar(presupuesto)} className="cursor-pointer gap-2">
                        <Check className="size-4" />
                        Marcar aprobado
                    </DropdownMenuItem>
                )}
                {puedeAprobarInterno && (
                    <DropdownMenuItem onSelect={() => onRechazar(presupuesto)} className="cursor-pointer gap-2">
                        Rechazar
                    </DropdownMenuItem>
                )}
                {puedeAplicar && (
                    <DropdownMenuItem onSelect={() => onAplicar(presupuesto)} className="cursor-pointer gap-2">
                        <Wrench className="size-4" />
                        Aplicar a la OT
                    </DropdownMenuItem>
                )}
                {editable && (
                    <DropdownMenuItem onSelect={() => onEdit(presupuesto)} className="cursor-pointer gap-2">
                        <Pencil className="size-4" />
                        Editar
                    </DropdownMenuItem>
                )}
                {puedeEliminar && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(presupuesto)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                        <Trash2 className="size-4" />
                        Eliminar
                    </DropdownMenuItem>
                )}
                {presupuesto.estado === 'convertido' && (
                    <DropdownMenuItem disabled className="gap-2">
                        <FileCheck2 className="size-4" />
                        Aplicado a OT
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
