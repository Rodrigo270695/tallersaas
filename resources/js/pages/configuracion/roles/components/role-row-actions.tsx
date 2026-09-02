import { Copy, KeyRound, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastManager } from '@/lib/toast';
import type { Role } from '../types';

export type RoleRowActionsProps = {
    role: Role;
    onEdit: (role: Role) => void;
    onDelete: (role: Role) => void;
    onManagePermissions: (role: Role) => void;
    canUpdate?: boolean;
    canDelete?: boolean;
};

export function RoleRowActions({
    role,
    onEdit,
    onDelete,
    onManagePermissions,
    canUpdate = true,
    canDelete = true,
}: RoleRowActionsProps) {
    const showEdit = canUpdate && !role.is_system;
    const showDelete = canDelete && !role.is_system;
    const showPermissions = canUpdate;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(role.name);
            toastManager.success({
                title: 'Nombre copiado',
                description: role.name,
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
                    aria-label={`Acciones para ${role.name}`}
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
                    Copiar nombre
                </DropdownMenuItem>

                {showPermissions && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() => onManagePermissions(role)}
                            className="cursor-pointer gap-2 text-primary focus:text-primary"
                        >
                            <KeyRound className="size-4" strokeWidth={2.25} />
                            Gestionar permisos
                        </DropdownMenuItem>
                    </>
                )}

                {role.is_system && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            disabled
                            className="gap-2 text-xs text-muted-foreground"
                        >
                            <Lock className="size-3.5" strokeWidth={2.25} />
                            Rol protegido: no se puede renombrar ni eliminar
                        </DropdownMenuItem>
                    </>
                )}

                {showEdit && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(role)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                )}

                {showDelete && (
                    <DropdownMenuItem
                        onSelect={() => onDelete(role)}
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
