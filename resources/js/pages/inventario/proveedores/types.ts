export type Proveedor = {
    id: string;
    ruc: string;
    razon_social: string;
    direccion: string | null;
    ubigeo_sunat: string | null;
    estado_sunat: string | null;
    condicion_sunat: string | null;
    telefono: string | null;
    email: string | null;
    notas: string | null;
    activo: boolean;
    created_at: string;
    updated_at: string;
};

export type ProveedorStats = {
    total: number;
    activos: number;
    inactivos: number;
    coincidencias: number;
};

export type ProveedorFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | 'activa' | 'inactiva';
};
