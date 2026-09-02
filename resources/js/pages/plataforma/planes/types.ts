export type PlanFeatureRow = {
    feature: string;
    valor_int: number | null;
    valor_bool: boolean | null;
    valor_str: string | null;
};

export type FeatureCatalogItem = {
    feature: string;
    type: 'int' | 'bool' | 'str';
    group: string;
    default: number | boolean | string | null;
};

export type Plan = {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    badge: string | null;
    color_hex: string | null;
    precio_mensual: string | number;
    precio_anual: string | number | null;
    trial_days: number;
    orden: number;
    es_publico: boolean;
    activo: boolean;
    features_count?: number;
    subscriptions_count?: number;
    features?: PlanFeatureRow[];
};

export type PlanFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todos' | 'activos' | 'inactivos' | 'publicos' | 'privados';
};

export type PlanStats = {
    total: number;
    activos: number;
    inactivos: number;
    publicos: number;
    coincidencias: number;
};
