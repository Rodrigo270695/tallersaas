export type MovimientoTipo = 'entrada' | 'salida' | 'merma' | 'ajuste';

export type Movimiento = {
    id: string;
    producto_id: string;
    sede_id: string;
    tipo: MovimientoTipo;
    delta: string | number;
    stock_anterior: string | number;
    stock_despues: string | number;
    notas: string | null;
    venta_id: string | null;
    created_at: string;
    sede_nombre?: string;
    producto?: { id: string; nombre: string; sku: string | null } | null;
    creado_por?: { id: string; name: string } | null;
};

export type ProductoMovimientoOption = {
    id: string;
    nombre: string;
    sku: string | null;
    unidad: string;
};

export type SedeOption = { id: string; nombre: string; codigo: string };

export type MovimientoFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    tipo: 'todos' | MovimientoTipo;
    sede_id: string;
    fecha_desde: string;
    fecha_hasta: string;
};

export type MovimientoFiltroUi = {
    default_desde: string;
    default_hasta: string;
    timezone: string;
};

export type MovimientoStats = {
    total: number;
    coincidencias: number;
};
