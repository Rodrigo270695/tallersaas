export type ClienteTipoDocumento = 'DNI' | 'RUC' | 'CE' | 'PAS';

export type Cliente = {
    id: string;
    nombres: string;
    apellidos: string | null;
    tipo_documento: ClienteTipoDocumento;
    numero_documento: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    activo: boolean;
    vehiculos_count?: number;
    created_at: string;
    updated_at: string;
};

export type ClienteStats = {
    total: number;
    activos: number;
    inactivos: number;
    /** Cantidad de coincidencias con los filtros vigentes (todas las páginas). */
    coincidencias: number;
};

export type ClienteFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: 'todas' | 'activo' | 'inactivo';
};
