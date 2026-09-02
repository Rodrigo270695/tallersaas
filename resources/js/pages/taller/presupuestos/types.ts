export type PresupuestoEstado =
    | 'borrador'
    | 'enviado'
    | 'aprobado'
    | 'rechazado'
    | 'vencido'
    | 'convertido';

export type PresupuestoItem = {
    id: string;
    tipo: 'servicio' | 'producto' | 'otro';
    servicio_id: string | null;
    producto_id: string | null;
    descripcion: string;
    cantidad: string | number;
    precio_unitario: string | number;
    subtotal: string | number;
};

export type PresupuestoClienteRef = {
    id: string;
    nombres: string;
    apellidos: string | null;
    telefono?: string | null;
} | null;

export type PresupuestoVehiculoRef = {
    id: string;
    placa: string;
    marca: { id: string; nombre: string } | null;
    modelo: { id: string; nombre: string } | null;
} | null;

export type PresupuestoOrdenRef = {
    id: string;
    numero: string;
    estado: string;
} | null;

export type Presupuesto = {
    id: string;
    sede_id: string;
    numero: string;
    cliente_id: string;
    vehiculo_id: string;
    orden_trabajo_id: string | null;
    estado: PresupuestoEstado;
    diagnostico: string | null;
    notas_internas: string | null;
    subtotal: string | number;
    igv_total: string | number;
    total: string | number;
    valido_hasta: string | null;
    public_token: string;
    enviado_at: string | null;
    aprobado_at: string | null;
    rechazado_at: string | null;
    convertido_at: string | null;
    cliente: PresupuestoClienteRef;
    vehiculo: PresupuestoVehiculoRef;
    sede: { id: string; nombre: string; codigo: string } | null;
    orden_trabajo: PresupuestoOrdenRef;
    items?: PresupuestoItem[];
    created_at: string;
};

export type SedeOption = { id: string; nombre: string; codigo: string };
export type ClienteOption = { id: string; nombre: string };
export type VehiculoOption = { id: string; cliente_id: string; label: string };
export type OrdenOption = {
    id: string;
    numero: string;
    cliente_id: string;
    vehiculo_id: string;
    sede_id: string;
};

export type PresupuestoStats = {
    total: number;
    pendientes: number;
    aprobados: number;
    coincidencias: number;
};

export type PresupuestoEstadoFilter = 'todas' | PresupuestoEstado;

export type PresupuestoFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: PresupuestoEstadoFilter;
};

export type PresupuestoIgv = {
    igv_porcentaje: string | number;
    precio_incluye_igv: boolean;
    moneda: string;
};

export type ProductoCobroOption = {
    id: string;
    nombre: string;
    sku: string | null;
    precio_venta: string | number | null;
    unidad: string;
};

export type ServicioCobroOption = {
    id: string;
    nombre: string;
    precio: string | number | null;
    duracion_minutos: number | null;
};
