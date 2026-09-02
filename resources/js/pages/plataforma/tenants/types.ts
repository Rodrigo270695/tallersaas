export type TenantEstado =
    | 'trial'
    | 'active'
    | 'grace'
    | 'suspended'
    | 'cancelled';

export type PlanCatalogItem = {
    id: string;
    codigo: string;
    nombre: string;
    trial_days: number;
    precio_mensual: string | number;
    color_hex: string | null;
};

export type TenantPlanRef = {
    id: string;
    codigo: string;
    nombre: string;
    badge: string | null;
    color_hex: string | null;
};

export type TenantSubscriptionRef = {
    id: string;
    estado: string;
    plan?: TenantPlanRef | null;
};

export type PlataformaTenant = {
    id: string;
    slug: string;
    razon_social: string;
    nombre_comercial: string | null;
    ruc: string | null;
    email_admin: string;
    telefono: string | null;
    direccion: string | null;
    estado: TenantEstado;
    trial_ends_at: string | null;
    created_at: string;
    subscriptions?: TenantSubscriptionRef[];
};

export type TenantFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todos' | TenantEstado;
};

export type TenantStats = {
    total: number;
    trial: number;
    active: number;
    suspended: number;
    cancelled: number;
    coincidencias: number;
};
