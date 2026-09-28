import { usePage } from '@inertiajs/react';

export type TenancyShared = {
    root_domain: string;
    scheme: string;
    login_path: string;
};

const FALLBACK: TenancyShared = {
    root_domain: 'tallersaas.orvae.pe',
    scheme: 'https',
    login_path: '/login',
};

export function useTenancy(): TenancyShared {
    const shared = usePage().props.tenancy as TenancyShared | undefined;

    if (shared?.root_domain) {
        return shared;
    }

    return FALLBACK;
}

export function tenantHost(slug: string, tenancy: TenancyShared): string {
    return `${slug}.${tenancy.root_domain}`;
}

export function tenantWorkshopUrl(slug: string, tenancy: TenancyShared): string {
    return `${tenancy.scheme}://${tenantHost(slug, tenancy)}/`;
}
