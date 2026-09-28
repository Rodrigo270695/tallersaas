import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/use-permission';

export function SiniestroRowActions({
    numero,
    onEdit,
    onDelete,
}: {
    numero: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const { can } = usePermission();
    if (!can('siniestros.update') && !can('siniestros.delete')) {
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
                    aria-label={`Acciones para ${numero}`}
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {can('siniestros.update') ? (
                    <DropdownMenuItem onSelect={onEdit} className="cursor-pointer gap-2">
                        <Pencil className="size-4" />
                        Editar
                    </DropdownMenuItem>
                ) : null}
                {can('siniestros.delete') ? (
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
