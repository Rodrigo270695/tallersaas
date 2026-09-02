export type CajaEstado = 'abierta' | 'cerrada';

export type CajaEgresoMotivo =
    | 'insumos'
    | 'delivery'
    | 'servicios'
    | 'personal'
    | 'cambio'
    | 'otros';

export const CAJA_EGRESO_MOTIVOS: readonly { value: CajaEgresoMotivo; label: string }[] = [
    { value: 'insumos', label: 'Repuestos / compras menores' },
    { value: 'delivery', label: 'Recados / envíos' },
    { value: 'servicios', label: 'Servicios externos' },
    { value: 'personal', label: 'Personal / anticipos' },
    { value: 'cambio', label: 'Cambio / vuelto' },
    { value: 'otros', label: 'Otros' },
];

export type CajaEgreso = {
    id: string;
    monto: string | number;
    motivo: CajaEgresoMotivo | string;
    motivo_label: string;
    descripcion: string | null;
    created_at: string | null;
    creado_por?: { id: string; name: string } | null;
};

export type CajaSesion = {
    id: string;
    sede_id: string;
    sede_nombre?: string;
    estado: CajaEstado;
    moneda: string;
    saldo_apertura: string | number;
    saldo_cierre_efectivo: string | number | null;
    opened_at: string;
    closed_at: string | null;
    notas: string | null;
    opened_by_id: string;
    abierta_por?: { id: string; name: string } | null;
    cerrada_por?: { id: string; name: string } | null;
    egresos?: CajaEgreso[];
    egresos_total?: string | number;
};

export type SedeOpcion = {
    id: string;
    nombre: string;
    codigo: string;
};

export type CajaFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | CajaEstado;
    sede_id: string;
};

export type CajaStats = {
    total: number;
    abiertas: number;
    cerradas: number;
    coincidencias: number;
};
