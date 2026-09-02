export type StockProducto = {
    id: string;
    nombre: string;
    sku: string | null;
    unidad: string;
    stock_minimo: string | number | null;
    activo: boolean;
    cantidad_stock: string | number | null;
    categoria?: { id: string; nombre: string } | null;
};

export type SedeOption = { id: string; nombre: string; codigo: string };

export type StockFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    sede_id: string;
};

export type StockStats = {
    total: number;
    coincidencias: number;
    bajo_minimo: number;
};
