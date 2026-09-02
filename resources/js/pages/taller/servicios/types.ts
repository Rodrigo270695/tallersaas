export type Servicio = {
    id: string;
    categoria_id: string | null;
    nombre: string;
    descripcion: string | null;
    precio: string | number;
    duracion_minutos: number | null;
    activo: boolean;
    categoria?: { id: string; nombre: string } | null;
};

export type CategoriaOption = { id: string; nombre: string };

export type ServicioFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | 'activa' | 'inactiva';
    categoria_id: string;
};

export type ServicioStats = {
    total: number;
    activos: number;
    inactivos: number;
    coincidencias: number;
};
