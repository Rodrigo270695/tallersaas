export type VehiculoClienteRef = {
    id: string;
    nombres: string;
    apellidos: string | null;
} | null;

export type VehiculoEntidadRef = {
    id: string;
    nombre: string;
} | null;

export type Vehiculo = {
    id: string;
    cliente_id: string;
    placa: string;
    tipo?: string | null;
    marca_id: string | null;
    modelo_id: string | null;
    color: string | null;
    anio: number | null;
    kilometraje: number | null;
    vin: string | null;
    foto_path: string | null;
    foto_url: string | null;
    activo: boolean;
    cliente: VehiculoClienteRef;
    marca: VehiculoEntidadRef;
    modelo: VehiculoEntidadRef;
    created_at: string;
    updated_at: string;
};

/** Opción liviana de cliente para el combobox del modal. */
export type ClienteOption = {
    id: string;
    nombre: string;
};

/** Opción liviana de marca para el combobox creable del modal. */
export type MarcaOption = {
    id: string;
    nombre: string;
};

/** Opción liviana de modelo (con su marca) para el combobox en cascada. */
export type ModeloOption = {
    id: string;
    marca_id: string;
    nombre: string;
};

export type VehiculoStats = {
    total: number;
    activos: number;
    inactivos: number;
    coincidencias: number;
};

export type VehiculoFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | 'activo' | 'inactivo';
};
