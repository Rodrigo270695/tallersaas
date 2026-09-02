export type OrdenEstado =
    | 'abierta'
    | 'en_proceso'
    | 'lista'
    | 'entregada'
    | 'anulada';

export type OrdenClienteRef = {
    id: string;
    nombres: string;
    apellidos: string | null;
    telefono?: string | null;
    tipo_documento?: string | null;
    numero_documento?: string | null;
} | null;

export type OrdenVehiculoRef = {
    id: string;
    placa: string;
    marca: string | null;
    modelo: string | null;
} | null;

export type OrdenSedeRef = {
    id: string;
    nombre: string;
    codigo: string;
} | null;

export type OrdenTrabajo = {
    id: string;
    sede_id: string;
    numero: string;
    cliente_id: string;
    vehiculo_id: string;
    estado: OrdenEstado;
    ingreso_at: string | null;
    prometida_at: string | null;
    km_ingreso: number | null;
    km_salida: number | null;
    solicitud_cliente: string | null;
    diagnostico: string | null;
    notas_internas: string | null;
    total: string | number;
    pagado_total: string | number;
    saldo: string | number;
    lista_notificada_at: string | null;
    cliente: OrdenClienteRef;
    vehiculo: OrdenVehiculoRef;
    sede: OrdenSedeRef;
    lineas?: OrdenLinea[];
    created_at: string;
    updated_at: string;
};

export type OrdenLinea = {
    id: string;
    tipo: 'servicio' | 'producto' | 'otro';
    servicio_id: string | null;
    producto_id: string | null;
    descripcion: string;
    cantidad: string | number;
    precio_unitario: string | number;
    subtotal: string | number;
};

export type SedeOption = {
    id: string;
    nombre: string;
    codigo: string;
};

export type ClienteOption = {
    id: string;
    nombre: string;
};

export type VehiculoOption = {
    id: string;
    cliente_id: string;
    label: string;
};

export type OrdenStats = {
    total: number;
    abiertas: number;
    en_proceso: number;
    listas: number;
    coincidencias: number;
};

export type OrdenEstadoFilter = 'todas' | OrdenEstado;

export type OrdenFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: OrdenEstadoFilter;
};

export type MiSesionAbierta = {
    id: string;
    sede_id: string;
    opened_at: string;
    saldo_apertura: string | number;
} | null;

export type OrdenIgv = {
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
