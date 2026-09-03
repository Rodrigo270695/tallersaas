export type CompraTipoComprobante = 'boleta' | 'factura';

export type CompraLinea = {
    id: string;
    producto_id: string;
    cantidad: string | number;
    costo_unitario: string | number | null;
    orden: number;
    producto?: { id: string; nombre: string; sku: string | null } | null;
};

export type Compra = {
    id: string;
    proveedor_id: string | null;
    sede_id: string;
    tipo_comprobante: CompraTipoComprobante;
    serie: string | null;
    numero_documento: string | null;
    fecha_documento: string;
    moneda: string;
    total: string | number | null;
    notas: string | null;
    factura_path: string | null;
    factura_original_name: string | null;
    factura_url: string | null;
    deleted_at: string | null;
    created_at: string;
    proveedor?: { id: string; ruc: string; razon_social: string } | null;
    lineas?: CompraLinea[];
    lineas_count?: number;
    sede_nombre?: string;
    creado_por?: { id: string; name: string } | null;
};

export type ProveedorOption = { id: string; ruc: string; razon_social: string };

export type SedeOption = { id: string; nombre: string; codigo: string };

export type ProductoOption = { id: string; nombre: string; sku: string | null; unidad: string };

export type UnidadOption = { codigo: string; nombre: string };

export type CompraStats = {
    total: number;
    coincidencias: number;
};

export type CompraFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'activa' | 'anulada';
    sede_id: string;
    proveedor_id: string;
    fecha_desde: string;
    fecha_hasta: string;
};

export type CompraFiltroUi = {
    default_desde: string;
    default_hasta: string;
    timezone: string;
};
