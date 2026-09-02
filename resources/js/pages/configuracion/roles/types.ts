export type RolePermissionRef = {
    id: number;
    name: string;
};

export type Role = {
    /** Spatie usa BIGINT auto-incrementado, no UUID. */
    id: number;
    name: string;
    guard_name: string;
    description: string | null;
    is_system: boolean;
    permissions_count: number;
    permissions: readonly RolePermissionRef[];
    created_at: string;
    updated_at: string;
};

export type RoleStats = {
    total: number;
    sistema: number;
    personalizados: number;
    coincidencias: number;
};

export type RoleTipoFilter = 'todos' | 'sistema' | 'personalizado';

export type RoleFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    tipo: RoleTipoFilter;
};

export type CatalogPermission = {
    id: number;
    name: string;
    action: string;
};

export type PermissionGroup = {
    module: string;
    permissions: readonly CatalogPermission[];
};

export type PermissionsCatalog = readonly PermissionGroup[];
