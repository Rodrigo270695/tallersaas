export type CategoriaProducto = {
    id: string;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    orden: number;
    productos_count?: number;
};

export type CategoriaFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | 'activa' | 'inactiva';
};

export type CategoriaStats = {
    total: number;
    activas: number;
    inactivas: number;
    coincidencias: number;
};
