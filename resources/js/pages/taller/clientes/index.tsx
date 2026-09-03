import { Head } from '@inertiajs/react';
import { Car, Filter, Plus, ScreenShare, Trash2, Users } from 'lucide-react';
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
} from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import { useRowSelection } from '@/hooks/use-row-selection';
import clientes from '@/routes/taller/clientes';
import type { Paginated } from '@/types';
import { ClienteBulkDeleteDialog } from './components/cliente-bulk-delete-dialog';
import { ClienteDeleteDialog } from './components/cliente-delete-dialog';
import { ClienteFormModal } from './components/cliente-form-modal';
import { ClienteRowActions } from './components/cliente-row-actions';
import type { Cliente, ClienteFilters, ClienteStats } from './types';

type ClientesIndexProps = {
    clientes: Paginated<Cliente>;
    filters: ClienteFilters;
    stats: ClienteStats;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; cliente: Cliente }
    | { type: 'delete'; cliente: Cliente }
    | { type: 'bulk-delete' };

const DEFAULT_PER_PAGE = 10;

/**
 * Página principal del módulo Clientes (Taller → Clientes).
 *
 * Sigue el mismo patrón del kit `data-page`: PageHeader + DataTable con
 * toolbar/paginación/selección integrados y modales de crear/editar/eliminar.
 */
export default function Index({
    clientes: paginated,
    filters,
    stats,
}: ClientesIndexProps) {
    const { can } = usePermission();
    const canCreate = can('clientes.create');
    const canUpdate = can('clientes.update');
    const canDelete = can('clientes.delete');
    const canBulkDelete = can('clientes.bulk-delete');
    const showRowActions = canUpdate || canDelete;

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: ClienteFilters['estado'] }>({
            routeUrl: clientes.index().url,
            initialFilters: filters,
            only: ['clientes', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar la lista de clientes.',
            storageKey: 'tallersaas.clientes.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openEdit = useCallback(
        (cliente: Cliente) => setModal({ type: 'edit', cliente }),
        [],
    );
    const openDelete = useCallback(
        (cliente: Cliente) => setModal({ type: 'delete', cliente }),
        [],
    );
    const openBulkDelete = useCallback(() => setModal({ type: 'bulk-delete' }), []);

    const selection = useRowSelection<Cliente, string | number>({
        rows: paginated.data,
        rowKey: (cliente) => cliente.id,
    });

    const activeFiltersCount = useMemo(() => {
        let count = 0;

        if (filters.search) {
            count += 1;
        }

        if (filters.estado !== 'todas') {
            count += 1;
        }

        if (filters.sort) {
            count += 1;
        }

        if (filters.per_page !== DEFAULT_PER_PAGE) {
            count += 1;
        }

        return count;
    }, [filters.search, filters.estado, filters.sort, filters.per_page]);

    const estadoOptions: FilterChip<ClienteFilters['estado']>[] = [
        { value: 'todas', label: 'Todas' },
        { value: 'activo', label: 'Activos' },
        { value: 'inactivo', label: 'Inactivos' },
    ];

    const columns = useMemo<DataTableColumn<Cliente>[]>(() => {
        const base: DataTableColumn<Cliente>[] = [
            {
                key: 'nombres',
                header: 'Cliente',
                sortable: true,
                cell: (cliente) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                            {cliente.nombres} {cliente.apellidos}
                        </span>
                        {cliente.email && (
                            <span className="text-xs text-muted-foreground">
                                {cliente.email}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: 'numero_documento',
                header: 'Documento',
                sortable: true,
                cell: (cliente) =>
                    cliente.numero_documento ? (
                        <span className="font-mono text-xs">
                            {cliente.tipo_documento} {cliente.numero_documento}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'telefono',
                header: 'Teléfono',
                sortable: true,
                cell: (cliente) =>
                    cliente.telefono ? (
                        <span className="text-sm tabular-nums">{cliente.telefono}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'vehiculos',
                header: 'Vehículos',
                cell: (cliente) => (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Car className="size-3.5" strokeWidth={2.25} />
                        {cliente.vehiculos_count ?? 0}
                    </span>
                ),
            },
            {
                key: 'activo',
                header: 'Estado',
                cell: (cliente) =>
                    cliente.activo ? (
                        <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400"
                        >
                            Activo
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                            Inactivo
                        </Badge>
                    ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (cliente: Cliente) => (
                    <div className="flex justify-end">
                        <ClienteRowActions
                            cliente={cliente}
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
    }, [showRowActions, canUpdate, canDelete, openEdit, openDelete]);

    return (
        <>
            <Head title="Clientes" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Clientes"
                    description="Registra y administra los clientes del taller."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Users },
                        { label: 'Activos', value: stats.activos, variant: 'primary', icon: Users },
                        {
                            label: 'Filtros',
                            value: filters.estado !== 'todas' ? 1 : 0,
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
                        <Can permission="clientes.create">
                            <Button
                                type="button"
                                onClick={openCreate}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">Nuevo cliente</span>
                                <span className="sm:hidden">Nuevo</span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(cliente) => cliente.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    selection={canBulkDelete ? selection : undefined}
                    ariaLiveMessage={`${stats.coincidencias} clientes encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por nombre, documento o teléfono…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar clientes por estado"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as ClienteFilters['estado'] })
                                }
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
                                estado: filters.estado !== 'todas' ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Users}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay clientes'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba ajustando la búsqueda o los filtros.'
                                    : 'Registra tu primer cliente para empezar a gestionar sus vehículos.'
                            }
                            action={
                                activeFiltersCount === 0 && canCreate ? (
                                    <Button
                                        type="button"
                                        onClick={openCreate}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus className="size-4" strokeWidth={2.5} />
                                        Crear el primer cliente
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <ClienteFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
closeModal();
}
                }}
                cliente={modal.type === 'edit' ? modal.cliente : null}
            />

            <ClienteDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
closeModal();
}
                }}
                cliente={modal.type === 'delete' ? modal.cliente : null}
            />

            <ClienteBulkDeleteDialog
                open={modal.type === 'bulk-delete'}
                onOpenChange={(open) => {
                    if (!open) {
closeModal();
}
                }}
                ids={Array.from(selection.selectedIds).map(String)}
                onCompleted={() => selection.clear()}
            />

            {canBulkDelete && (
                <BulkActionBar
                    count={selection.count}
                    labels={{ singular: 'cliente seleccionado', plural: 'clientes seleccionados' }}
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
                        <span className="hidden sm:inline">Eliminar seleccionados</span>
                    </BulkAction>
                </BulkActionBar>
            )}
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Taller' },
        { title: 'Clientes', href: clientes.index().url },
    ],
};
