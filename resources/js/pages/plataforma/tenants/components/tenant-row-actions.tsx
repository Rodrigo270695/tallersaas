import { router } from '@inertiajs/react';
import { Copy, ExternalLink, LogIn, MoreHorizontal, PauseCircle, Pencil, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastManager } from '@/lib/toast';
import { tenantExternalUrl, useTenancy } from '@/lib/tenancy-url';
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
    const tenancy = useTenancy();
    const canEnter =
        canImpersonate && tenant.estado !== 'cancelled' && tenant.estado !== 'suspended';
    const canStop = canSuspend && tenant.estado !== 'suspended' && tenant.estado !== 'cancelled';
    const canPlay = canResume && tenant.estado === 'suspended';

    const copySlug = async () => {
        try {
            await navigator.clipboard.writeText(tenant.slug);
            toastManager.success({ title: 'Slug copiado', description: tenant.slug, duration: 2000 });
        } catch {
            toastManager.error({ title: 'No se pudo copiar el slug' });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer"
                    aria-label={`Acciones para ${tenant.razon_social}`}
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onSelect={copySlug} className="cursor-pointer gap-2">
                    <Copy className="size-4" strokeWidth={2.25} />
                    Copiar slug
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <a
                        href={tenantExternalUrl(tenant.slug, tenancy)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => {
                            event.preventDefault();
                            window.open(
                                tenantExternalUrl(tenant.slug, tenancy),
                                '_blank',
                                'noopener,noreferrer',
                            );
                        }}
                    >
                        <ExternalLink className="size-4" strokeWidth={2.25} />
                        Abrir subdominio
                    </a>
                </DropdownMenuItem>
                {canEnter ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() => router.post(tenants.impersonate(tenant.id).url)}
                            className="cursor-pointer gap-2 text-violet-700 focus:text-violet-700"
                        >
                            <LogIn className="size-4" strokeWidth={2.25} />
                            Entrar como soporte
                        </DropdownMenuItem>
                    </>
                ) : null}
                {canUpdate || canStop || canPlay ? <DropdownMenuSeparator /> : null}
                {canUpdate ? (
                    <DropdownMenuItem onSelect={() => onEdit(tenant)} className="cursor-pointer gap-2">
                        <Pencil className="size-4" strokeWidth={2.25} />
                        Editar
                    </DropdownMenuItem>
                ) : null}
                {canStop ? (
                    <DropdownMenuItem
                        onSelect={() => onSuspend(tenant)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                        <PauseCircle className="size-4" strokeWidth={2.25} />
                        Suspender
                    </DropdownMenuItem>
                ) : null}
                {canPlay ? (
                    <DropdownMenuItem
                        onSelect={() => router.post(tenants.resume(tenant.id).url, {}, { preserveScroll: true })}
                        className="cursor-pointer gap-2"
                    >
                        <PlayCircle className="size-4" strokeWidth={2.25} />
                        Reanudar
                    </DropdownMenuItem>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
