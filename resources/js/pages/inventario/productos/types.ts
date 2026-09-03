export type Producto = {
    id: string;
    categoria_id: string | null;
    nombre: string;
    descripcion: string | null;
    sku: string | null;
    codigo_barras: string | null;
    unidad: string;
    precio_venta: string | number | null;
    precio_compra: string | number | null;
    stock_minimo: string | number | null;
    foto_path: string | null;
    foto_url: string | null;
    activo: boolean;
    categoria?: { id: string; nombre: string } | null;
};

export type ProductoOption = { id: string; nombre: string };

export type SedeOption = { id: string; nombre: string; codigo: string };

export type ProductoFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | 'activa' | 'inactiva';
    categoria_id: string;
};

export type ProductoStats = {
    total: number;
    activos: number;
    inactivos: number;
    coincidencias: number;
};
