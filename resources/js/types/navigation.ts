import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
};

export type NavContext = 'central' | 'tenant' | 'both';

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Permiso(s) requerido(s) para ver este item. Si es array, basta con uno (OR). */
    permission?: string | string[];
    /** En qué contexto debe mostrarse: panel central, taller (tenant), o ambos. */
    context?: NavContext;
};

export type NavGroup = {
    title: string;
    icon?: LucideIcon;
    defaultOpen?: boolean;
    permission?: string | string[];
    context?: NavContext;
    items: NavItem[];
};
