export type VehiculoClienteRef = {
    id: string;
    nombres: string;
    apellidos: string | null;
} | null;

export type Vehiculo = {
    id: string;
    cliente_id: string;
    placa: string;
    marca: string | null;
    modelo: string | null;
    color: string | null;
    anio: number | null;
    kilometraje: number | null;
    vin: string | null;
    cliente: VehiculoClienteRef;
    created_at: string;
    updated_at: string;
};

/** Opción liviana de cliente para el select del modal. */
export type ClienteOption = {
    id: string;
    nombre: string;
};

export type VehiculoStats = {
    total: number;
    coincidencias: number;
};

export type VehiculoFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};
