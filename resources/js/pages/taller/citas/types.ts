export type CitaEstado =
    | 'programada'
    | 'confirmada'
    | 'en_recepcion'
    | 'convertida'
    | 'no_asistio'
    | 'cancelada';

export type CitaRango = 'hoy' | 'proximas' | 'todas';

export type VistaCita = 'calendario' | 'lista';

export type CitaFormPrefill = {
    fecha?: string;
    hora?: string;
};

export type CitaClienteRef = {
    id: string;
    nombres: string;
    apellidos: string | null;
} | null;

export type CitaVehiculoRef = {
    id: string;
    placa: string;
    marca: { id: string; nombre: string } | null;
    modelo: { id: string; nombre: string } | null;
} | null;

export type CitaSedeRef = {
    id: string;
    nombre: string;
    codigo: string;
} | null;

export type CitaOrdenRef = {
    id: string;
    numero: string;
    estado: string;
} | null;

export type Cita = {
    id: string;
    sede_id: string;
    cliente_id: string;
    vehiculo_id: string;
    assigned_user_id: string | null;
    inicia_at: string;
    duracion_minutos: number;
    estado: CitaEstado;
    motivo: string | null;
    notas: string | null;
    orden_trabajo_id: string | null;
    cliente: CitaClienteRef;
    vehiculo: CitaVehiculoRef;
    sede: CitaSedeRef;
    asignado_a: { id: string; name: string } | null;
    orden_trabajo: CitaOrdenRef;
    created_at: string;
    updated_at: string;
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

export type MecanicoOption = {
    id: string;
    name: string;
};

export type CitaFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | CitaEstado;
    rango: CitaRango;
    vista: VistaCita;
    mes: string | null;
};

export type CitaStats = {
    hoy: number;
    proximas: number;
    convertidas: number;
    coincidencias: number;
};
