export type UnidadMedida = {
    id: string;
    codigo: string;
    nombre: string;
    orden: number;
    activo: boolean;
};

export type UnidadMedidaFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | 'activa' | 'inactiva';
};

export type UnidadMedidaStats = {
    total: number;
    activas: number;
    inactivas: number;
    coincidencias: number;
};
