import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/use-permission';

export function PuestoRowActions({
    nombre,
    onEdit,
    onDelete,
}: {
    nombre: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const { can } = usePermission();
    if (!can('puestos.update') && !can('puestos.delete')) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer"
                    aria-label={`Acciones para ${nombre}`}
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {can('puestos.update') ? (
                    <DropdownMenuItem onSelect={onEdit} className="cursor-pointer gap-2">
                        <Pencil className="size-4" />
                        Editar
                    </DropdownMenuItem>
                ) : null}
                {can('puestos.delete') ? (
                    <DropdownMenuItem
                        onSelect={onDelete}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                        <Trash2 className="size-4" />
                        Eliminar
                    </DropdownMenuItem>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
