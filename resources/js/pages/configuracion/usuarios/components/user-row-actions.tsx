import { Copy, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastManager } from '@/lib/toast';
import type { User } from '../types';

export type UserRowActionsProps = {
    user: User;
    currentUserId: string | null;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
};

export function UserRowActions({
    user,
    currentUserId,
    onEdit,
    onDelete,
    canUpdate = true,
    canDelete = true,
}: UserRowActionsProps) {
    const isSelf = currentUserId === user.id;
    const isSuperadmin = user.roles.some((r) => r.name === 'superadmin');
    const showEdit = canUpdate;
    const showDelete = canDelete && !isSelf && !isSuperadmin;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(user.email);
            toastManager.success({
                title: 'Correo copiado',
                description: user.email,
                duration: 2000,
            });
        } catch {
            toastManager.error({
                title: 'No se pudo copiar',
            });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Acciones para ${user.name}`}
                    className="size-8 cursor-pointer"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                    onSelect={handleCopy}
                    className="cursor-pointer gap-2"
                >
                    <Copy className="size-4" strokeWidth={2.25} />
                    Copiar correo
                </DropdownMenuItem>

                {(showEdit || showDelete) && <DropdownMenuSeparator />}

                {showEdit && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(user)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}

                {showDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(user)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                        <Trash2 className="size-4" strokeWidth={2.25} />
                        Eliminar
                    </DropdownMenuItem>
                )}

                {(isSelf || isSuperadmin) && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            disabled
                            className="gap-2 text-xs text-muted-foreground"
                        >
                            <Lock className="size-3.5" strokeWidth={2.25} />
                            {isSelf
                                ? 'No puedes eliminar tu propia cuenta'
                                : 'El superadmin no se puede eliminar'}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
