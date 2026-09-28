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
    ciclo?: string | null;
    trial_ends_at?: string | null;
    current_period_end?: string | null;
    proximo_cobro_at?: string | null;
    plan?: TenantPlanRef | null;
};

export type TenantSedeRef = {
    id: string;
    direccion: string | null;
    distrito: string | null;
    provincia: string | null;
    departamento: string | null;
    distrito_id: number | null;
    distrito_model?: {
        id: number;
        provincia_id: number;
        provincia?: {
            id: number;
            departamento_id: number;
        } | null;
    } | null;
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
    timezone: string | null;
    locale: string | null;
    estado: TenantEstado;
    trial_ends_at: string | null;
    created_at: string;
    subscriptions?: TenantSubscriptionRef[];
    sedes?: TenantSedeRef[];
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
