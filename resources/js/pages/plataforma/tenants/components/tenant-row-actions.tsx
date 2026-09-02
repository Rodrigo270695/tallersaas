import { router } from '@inertiajs/react';
import {
    LogIn,
    MoreHorizontal,
    PauseCircle,
    Pencil,
    PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import tenants from '@/routes/plataforma/tenants';
import type { PlataformaTenant } from '../types';

export function TenantRowActions({
    tenant,
    onEdit,
    onSuspend,
    canUpdate,
    canSuspend,
    canResume,
    canImpersonate,
}: {
    tenant: PlataformaTenant;
    onEdit: (tenant: PlataformaTenant) => void;
    onSuspend: (tenant: PlataformaTenant) => void;
    canUpdate: boolean;
    canSuspend: boolean;
    canResume: boolean;
    canImpersonate: boolean;
}) {
    const show =
        canUpdate ||
        (canSuspend && tenant.estado !== 'suspended' && tenant.estado !== 'cancelled') ||
        (canResume && tenant.estado === 'suspended') ||
        (canImpersonate && tenant.estado !== 'cancelled' && tenant.estado !== 'suspended');

    if (!show) {
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
                    aria-label={`Acciones para ${tenant.slug}`}
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {canUpdate && (
                    <DropdownMenuItem
                        onSelect={() => onEdit(tenant)}
                        className="cursor-pointer gap-2"
                    >
                        <Pencil className="size-4" />
                        Editar
                    </DropdownMenuItem>
                )}
                {canImpersonate &&
                    tenant.estado !== 'cancelled' &&
                    tenant.estado !== 'suspended' && (
                        <DropdownMenuItem
                            onSelect={() =>
                                router.post(tenants.impersonate(tenant.id).url)
                            }
                            className="cursor-pointer gap-2"
                        >
                            <LogIn className="size-4" />
                            Entrar como soporte
                        </DropdownMenuItem>
                    )}
                {canSuspend &&
                    tenant.estado !== 'suspended' &&
                    tenant.estado !== 'cancelled' && (
                        <DropdownMenuItem
                            onSelect={() => onSuspend(tenant)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        >
                            <PauseCircle className="size-4" />
                            Suspender
                        </DropdownMenuItem>
                    )}
                {canResume && tenant.estado === 'suspended' && (
                    <DropdownMenuItem
                        onSelect={() =>
                            router.post(tenants.resume(tenant.id).url, {}, { preserveScroll: true })
                        }
                        className="cursor-pointer gap-2"
                    >
                        <PlayCircle className="size-4" />
                        Reanudar
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
