import { usePage } from '@inertiajs/react';
import { TallerLogoMark } from '@/components/taller-logo-mark';
import { useTallerBranding } from '@/hooks/use-taller-branding';
import type { TenantShared } from '@/types/tenant';

export default function AppLogo() {
    const tenant = usePage().props.tenant as TenantShared | null;
    const branding = useTallerBranding();
    const brandTitle = tenant
        ? (tenant.nombre_comercial || tenant.razon_social).trim()
        : 'TallerSaaS';

    return (
        <>
            <TallerLogoMark
                key={branding?.updated_at ?? 'default'}
                logoUrl={branding?.logo_url}
                className="size-8 rounded-md"
            />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold tracking-tight">
                    {brandTitle}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    Gestión de taller mecánico
                </span>
            </div>
        </>
    );
}
