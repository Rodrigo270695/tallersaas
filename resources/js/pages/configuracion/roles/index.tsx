import { Head } from '@inertiajs/react';
import {
    CheckCircle2,
    Filter,
    KeyRound,
    Lock,
    Plus,
    ScreenShare,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Can } from '@/components/can';
import {
    BulkAction,
    BulkActionBar,
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    PageHeader,
    StatBadge,
} from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import { useRowSelection } from '@/hooks/use-row-selection';
import roles from '@/routes/configuracion/roles';
import type { Paginated } from '@/types';
import { RoleBulkDeleteDialog } from './components/role-bulk-delete-dialog';
import { RoleDeleteDialog } from './components/role-delete-dialog';
import { RoleFormModal } from './components/role-form-modal';
import { RolePermissionsModal } from './components/role-permissions-modal';
import { RoleRowActions } from './components/role-row-actions';
import type {
    PermissionsCatalog,
    Role,
    RoleFilters,
    RoleStats,
    RoleTipoFilter,
} from './types';

type RolesIndexProps = {
    roles: Paginated<Role>;
    filters: RoleFilters;
    stats: RoleStats;
    permissions_catalog: PermissionsCatalog;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; role: Role }
    | { type: 'permissions'; role: Role }
    | { type: 'delete'; role: Role }
    | { type: 'bulk-delete' };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_TIPO: RoleTipoFilter = 'todos';

export default function Index({
    roles: paginated,
    filters,
    stats,
    permissions_catalog,
}: RolesIndexProps) {
    const { can } = usePermission();
    const canCreate = can('roles.create');
    const canUpdate = can('roles.update');
    const canDelete = can('roles.delete');
    const canBulkDelete = can('roles.bulk-delete');
    const showRowActions = canUpdate || canDelete;

    const {
        search,
        setSearch,
        isLoading,
        sort,
        setSort,
        setPerPage,
        applyFilter,
    } = useDataTablePage<{ tipo: RoleTipoFilter }>({
        routeUrl: roles.index().url,
        initialFilters: filters,
        only: ['roles', 'filters', 'stats'],
        errorMessage: 'No se pudo cargar la lista de roles.',
        storageKey: 'tallersaas.roles.prefs',
        defaults: {
            per_page: DEFAULT_PER_PAGE,
            sort: null,
            direction: null,
        },
    });

    const tipoOptions: readonly FilterChip<RoleTipoFilter>[] = useMemo(
        () => [
            { value: 'todos', label: 'Todos' },
            { value: 'sistema', label: 'Sistema' },
            { value: 'personalizado', label: 'Personalizados' },
        ],
        [],
    );

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });

    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openEdit = useCallback(
        (role: Role) => setModal({ type: 'edit', role }),
        [],
    );
    const openManagePermissions = useCallback(
        (role: Role) => setModal({ type: 'permissions', role }),
        [],
    );
    const openDelete = useCallback(
        (role: Role) => setModal({ type: 'delete', role }),
        [],
    );
    const openBulkDelete = useCallback(
        () => setModal({ type: 'bulk-delete' }),
        [],
    );

    const selection = useRowSelection<Role, string | number>({
        rows: paginated.data,
        rowKey: (role) => role.id,
    });

    const activeFiltersCount = useMemo(() => {
        let count = 0;

        if (filters.search) {
            count += 1;
        }

        if (filters.sort) {
            count += 1;
        }

        if (filters.tipo !== DEFAULT_TIPO) {
            count += 1;
        }

        if (filters.per_page !== DEFAULT_PER_PAGE) {
            count += 1;
        }

        return count;
    }, [filters.search, filters.sort, filters.tipo, filters.per_page]);

    const columns = useMemo<DataTableColumn<Role>[]>(() => {
        const base: DataTableColumn<Role>[] = [
            {
                key: 'name',
                header: 'Rol',
                sortable: true,
                cell: (role) => (
                    <div className="flex items-center gap-2">
                        <span
                            className={
                                role.is_system
                                    ? 'flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'
                            }
                        >
                            {role.is_system ? (
                                <Lock className="size-3.5" strokeWidth={2.5} />
                            ) : (
                                <ShieldCheck
                                    className="size-3.5"
                                    strokeWidth={2.5}
                                />
                            )}
                        </span>
                        <div className="flex flex-col leading-tight">
                            <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                                {role.name}
                            </span>
                            <span className="text-[0.65rem] text-muted-foreground">
                                {role.guard_name}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'description',
                header: 'Descripción',
                sortable: true,
                cell: (role) =>
                    role.description ? (
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                            {role.description}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">
                            Sin descripción
                        </span>
                    ),
            },
            {
                key: 'tipo',
                header: 'Tipo',
                cell: (role) =>
                    role.is_system ? (
                        <StatBadge label="Sistema" value="" variant="warning" />
                    ) : (
                        <StatBadge
                            label="Personalizado"
                            value=""
                            variant="success"
                        />
                    ),
            },
            {
                key: 'permissions_count',
                header: 'Permisos',
                sortable: true,
                cell: (role) => (
                    <div className="flex items-center gap-1.5">
                        <KeyRound
                            className="size-3.5 shrink-0 text-primary/70"
                            strokeWidth={2.25}
                        />
                        <span className="text-sm tabular-nums">
                            {role.permissions_count}
                        </span>
                    </div>
                ),
            },
            {
                key: 'created_at',
                header: 'Creado',
                sortable: true,
                cell: (role) => (
                    <span className="text-xs text-muted-foreground">
                        {new Date(role.created_at).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </span>
                ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (role: Role) => (
                    <div className="flex justify-end">
                        <RoleRowActions
                            role={role}
                            onEdit={openEdit}
                            onDelete={openDelete}
                            onManagePermissions={openManagePermissions}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                        />
                    </div>
                ),
                className: 'w-12',
            });
        }

        return base;
    }, [
        showRowActions,
        canUpdate,
        canDelete,
        openEdit,
        openDelete,
        openManagePermissions,
    ]);

    return (
        <>
            <Head title="Roles y permisos" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Roles y permisos"
                    description="Define qué puede hacer cada tipo de usuario. Los roles base están protegidos: no se pueden eliminar ni renombrar, pero sí ajustar permisos."
                    stats={[
                        {
                            label: 'Total',
                            value: stats.total,
                            variant: 'info',
                            icon: ShieldCheck,
                        },
                        {
                            label: 'Sistema',
                            value: stats.sistema,
                            variant: 'warning',
                            icon: Lock,
                        },
                        {
                            label: 'Personalizados',
                            value: stats.personalizados,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: 'Filtros',
                            value: activeFiltersCount,
                            variant: 'warning',
                            icon: Filter,
                        },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        <Can permission="roles.create">
                            <Button
                                type="button"
                                onClick={openCreate}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    Nuevo rol
                                </span>
                                <span className="sm:hidden">Nuevo</span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(role) => role.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    selection={canBulkDelete ? selection : undefined}
                    ariaLiveMessage={`${stats.coincidencias} roles encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por nombre o descripción…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por tipo"
                                value={filters.tipo}
                                onChange={(tipo) => applyFilter({ tipo })}
                                options={tipoOptions}
                            />
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                sort: filters.sort ?? undefined,
                                direction: filters.direction ?? undefined,
                                tipo:
                                    filters.tipo !== DEFAULT_TIPO
                                        ? filters.tipo
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ShieldCheck}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay roles personalizados'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Ningún rol coincide con los filtros actuales.'
                                    : 'Crea tu primer rol para asignar permisos específicos a un grupo de usuarios.'
                            }
                            action={
                                activeFiltersCount === 0 && canCreate ? (
                                    <Button
                                        type="button"
                                        onClick={openCreate}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus
                                            className="size-4"
                                            strokeWidth={2.5}
                                        />
                                        Crear primer rol
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <RoleFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                role={modal.type === 'edit' ? modal.role : null}
            />

            <RolePermissionsModal
                open={modal.type === 'permissions'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                role={modal.type === 'permissions' ? modal.role : null}
                catalog={permissions_catalog}
            />

            <RoleDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                role={modal.type === 'delete' ? modal.role : null}
            />

            <RoleBulkDeleteDialog
                open={modal.type === 'bulk-delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                ids={Array.from(selection.selectedIds, Number)}
                onCompleted={() => selection.clear()}
            />

            {canBulkDelete && (
                <BulkActionBar
                    count={selection.count}
                    labels={{
                        singular: 'rol seleccionado',
                        plural: 'roles seleccionados',
                    }}
                    onClear={selection.clear}
                >
                    <BulkAction
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={openBulkDelete}
                        className="cursor-pointer gap-1.5"
                    >
                        <Trash2 className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">
                            Eliminar seleccionados
                        </span>
                    </BulkAction>
                </BulkActionBar>
            )}
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Configuración' },
        { title: 'Roles', href: '/configuracion/roles' },
    ],
};
