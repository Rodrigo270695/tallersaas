export type VentaEstado = 'pendiente' | 'pagado' | 'parcial' | 'anulado';

export type Venta = {
    id: string;
    numero: string;
    estado: VentaEstado;
    total: string | number;
    metodo_pago: string;
    fecha_pago: string | null;
    created_at: string;
    cliente?: { id: string; nombres: string; apellidos: string | null } | null;
    vehiculo?: { id: string; placa: string } | null;
    orden_trabajo?: { id: string; numero: string } | null;
    sede?: { id: string; nombre: string } | null;
    fel_estado?: 'pendiente' | 'emitido' | 'rechazado' | null;
    tipo_comprobante_sunat?: number | null;
};

export type VentaFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | VentaEstado;
    metodo_pago: 'todos' | string;
    tipo_comprobante: 'todos' | 'ticket' | 'boleta' | 'factura';
    fecha_desde: string;
    fecha_hasta: string;
};

export type VentaFiltroUi = {
    default_desde: string;
    default_hasta: string;
    timezone: string;
};

export type VentaStats = {
    total: number;
    pagadas: number;
    anuladas: number;
    coincidencias: number;
};
