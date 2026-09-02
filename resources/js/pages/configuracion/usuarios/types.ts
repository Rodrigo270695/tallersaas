export type UserRoleRef = {
    id: number;
    name: string;
};

export type UserCreatedByRef = {
    id: string;
    name: string;
};

export type User = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    email_verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    roles: readonly UserRoleRef[];
    created_by: UserCreatedByRef | null;
};

export type UserStats = {
    total: number;
    activos: number;
    inactivos: number;
    coincidencias: number;
};

export type UserEstadoFilter = 'todos' | 'activos' | 'inactivos';

export type UserFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: UserEstadoFilter;
    rol: string | null;
};

export type UserRoleOption = {
    id: number;
    name: string;
    description: string | null;
    is_system: boolean;
};
