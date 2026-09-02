import { Head, usePage } from '@inertiajs/react';
import {
    Activity,
    CheckCircle2,
    Filter,
    MailCheck,
    PauseCircle,
    Plus,
    ScreenShare,
    ShieldCheck,
    Trash2,
    UserCog,
    Users as UsersIcon,
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
import usuarios from '@/routes/configuracion/usuarios';
import type { Auth, Paginated } from '@/types';
import { UserBulkDeleteDialog } from './components/user-bulk-delete-dialog';
import { UserDeleteDialog } from './components/user-delete-dialog';
import { UserFormModal } from './components/user-form-modal';
import { UserRowActions } from './components/user-row-actions';
import type {
    User,
    UserEstadoFilter,
    UserFilters,
    UserRoleOption,
    UserStats,
} from './types';

type UsuariosIndexProps = {
    users: Paginated<User>;
    filters: UserFilters;
    stats: UserStats;
    roles_catalog: readonly UserRoleOption[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; user: User }
    | { type: 'delete'; user: User }
    | { type: 'bulk-delete' };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO: UserEstadoFilter = 'todos';

export default function Index({
    users: paginated,
    filters,
    stats,
    roles_catalog,
}: UsuariosIndexProps) {
    const { can } = usePermission();
    const canCreate = can('usuarios.create');
    const canUpdate = can('usuarios.update');
    const canDelete = can('usuarios.delete');
    const canBulkDelete = can('usuarios.bulk-delete');
    const showRowActions = canUpdate || canDelete;

    const page = usePage<{ auth: Auth }>();
    const currentUserId = useMemo(() => {
        const id = page.props.auth.user?.id;

        return typeof id === 'string' ? id : id != null ? String(id) : null;
    }, [page.props.auth.user?.id]);

    const {
        search,
        setSearch,
        isLoading,
        sort,
        setSort,
        setPerPage,
        applyFilter,
    } = useDataTablePage<{
        estado: UserEstadoFilter;
        rol: string | null;
    }>({
        routeUrl: usuarios.index().url,
        initialFilters: filters,
        only: ['users', 'filters', 'stats'],
        errorMessage: 'No se pudo cargar la lista de usuarios.',
        storageKey: 'tallersaas.usuarios.prefs',
        defaults: {
            per_page: DEFAULT_PER_PAGE,
            sort: null,
            direction: null,
        },
    });

    const estadoOptions: readonly FilterChip<UserEstadoFilter>[] = useMemo(
        () => [
            { value: 'todos', label: 'Todos' },
            { value: 'activos', label: 'Activos' },
            { value: 'inactivos', label: 'Inactivos' },
        ],
        [],
    );

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });

    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openEdit = useCallback(
        (user: User) => setModal({ type: 'edit', user }),
        [],
    );
    const openDelete = useCallback(
        (user: User) => setModal({ type: 'delete', user }),
        [],
    );
    const openBulkDelete = useCallback(
        () => setModal({ type: 'bulk-delete' }),
        [],
    );

    const selection = useRowSelection<User, string | number>({
        rows: paginated.data,
        rowKey: (user) => user.id,
    });

    const activeFiltersCount = useMemo(() => {
        let count = 0;

        if (filters.search) {
            count += 1;
        }

        if (filters.sort) {
            count += 1;
        }

        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }

        if (filters.rol) {
            count += 1;
        }

        if (filters.per_page !== DEFAULT_PER_PAGE) {
            count += 1;
        }

        return count;
    }, [
        filters.search,
        filters.sort,
        filters.estado,
        filters.rol,
        filters.per_page,
    ]);

    const formatDate = (iso: string | null): string => {
        if (!iso) {
            return 'Nunca';
        }

        return new Date(iso).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const columns = useMemo<DataTableColumn<User>[]>(() => {
        const base: DataTableColumn<User>[] = [
            {
                key: 'name',
                header: 'Usuario',
                sortable: true,
                cell: (user) => {
                    const isSelf = currentUserId === user.id;
                    const isSuperadmin = user.roles.some(
                        (r) => r.name === 'superadmin',
                    );

                    return (
                        <div className="flex items-center gap-2">
                            <span
                                className={
                                    isSuperadmin
                                        ? 'flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'
                                }
                            >
                                <UserCog
                                    className="size-4"
                                    strokeWidth={2.25}
                                />
                            </span>
                            <div className="flex min-w-0 flex-col leading-tight">
                                <div className="flex items-center gap-1.5">
                                    <span className="truncate text-sm font-semibold text-foreground">
                                        {user.name}
                                    </span>
                                    {isSelf && (
                                        <StatBadge
                                            label="Tú"
                                            value=""
                                            variant="info"
                                        />
                                    )}
                                </div>
                                <span className="truncate text-xs text-muted-foreground">
                                    {user.email}
                                </span>
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'phone',
                header: 'Teléfono',
                cell: (user) =>
                    user.phone ? (
                        <span className="font-mono text-xs text-foreground/80">
                            {user.phone}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">
                            Sin teléfono
                        </span>
                    ),
            },
            {
                key: 'role',
                header: 'Rol',
                cell: (user) => {
                    const role = user.roles[0];

                    if (!role) {
                        return (
                            <span className="text-xs text-muted-foreground italic">
                                Sin rol
                            </span>
                        );
                    }

                    const isSuperadmin = role.name === 'superadmin';

                    return (
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck
                                className={
                                    isSuperadmin
                                        ? 'size-3.5 shrink-0 text-amber-600 dark:text-amber-400'
                                        : 'size-3.5 shrink-0 text-primary/70'
                                }
                                strokeWidth={2.25}
                            />
                            <span className="font-mono text-xs">
                                {role.name}
                            </span>
                        </div>
                    );
                },
            },
            {
                key: 'status',
                header: 'Estado',
                cell: (user) =>
                    user.is_active ? (
                        <StatBadge label="Activo" value="" variant="success" />
                    ) : (
                        <StatBadge
                            label="Suspendido"
                            value=""
                            variant="warning"
                        />
                    ),
            },
            {
                key: 'last_login_at',
                header: 'Último acceso',
                sortable: true,
                cell: (user) => (
                    <span
                        className={
                            user.last_login_at
                                ? 'text-xs text-muted-foreground'
                                : 'text-xs text-muted-foreground italic'
                        }
                    >
                        {formatDate(user.last_login_at)}
                    </span>
                ),
            },
            {
                key: 'created_at',
                header: 'Creado',
                sortable: true,
                cell: (user) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(user.created_at)}
                    </span>
                ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (user: User) => (
                    <div className="flex justify-end">
                        <UserRowActions
                            user={user}
                            currentUserId={currentUserId}
                            onEdit={openEdit}
                            onDelete={openDelete}
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
        currentUserId,
    ]);

    return (
        <>
            <Head title="Usuarios" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Usuarios"
                    description="Administra las cuentas de este taller. Cada usuario tiene un único rol, y los permisos se definen en Configuración → Roles."
                    stats={[
                        {
                            label: 'Total',
                            value: stats.total,
                            variant: 'info',
                            icon: UsersIcon,
                        },
                        {
                            label: 'Activos',
                            value: stats.activos,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: 'Inactivos',
                            value: stats.inactivos,
                            variant: 'warning',
                            icon: PauseCircle,
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
                        <Can permission="usuarios.create">
                            <Button
                                type="button"
                                onClick={openCreate}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    Nuevo usuario
                                </span>
                                <span className="sm:hidden">Nuevo</span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(user) => user.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    selection={canBulkDelete ? selection : undefined}
                    ariaLiveMessage={`${stats.coincidencias} usuarios encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por nombre, correo o teléfono…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.estado}
                                onChange={(estado) => applyFilter({ estado })}
                                options={estadoOptions}
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
                                estado:
                                    filters.estado !== DEFAULT_ESTADO
                                        ? filters.estado
                                        : undefined,
                                rol: filters.rol ?? undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={activeFiltersCount > 0 ? Activity : MailCheck}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay usuarios'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Ningún usuario coincide con los filtros actuales.'
                                    : 'Crea el primer usuario de este taller y asígnale un rol.'
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
                                        Crear primer usuario
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <UserFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                user={modal.type === 'edit' ? modal.user : null}
                rolesCatalog={roles_catalog}
            />

            <UserDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                user={modal.type === 'delete' ? modal.user : null}
                currentUserId={currentUserId}
            />

            <UserBulkDeleteDialog
                open={modal.type === 'bulk-delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                ids={Array.from(selection.selectedIds, String)}
                onCompleted={() => selection.clear()}
            />

            {canBulkDelete && (
                <BulkActionBar
                    count={selection.count}
                    labels={{
                        singular: 'usuario seleccionado',
                        plural: 'usuarios seleccionados',
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
        { title: 'Usuarios', href: '/configuracion/usuarios' },
    ],
};
