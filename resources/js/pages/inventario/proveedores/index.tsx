import { Head } from '@inertiajs/react';
import { Filter, Plus, ScreenShare, Truck } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    PageHeader,
} from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import proveedores from '@/routes/inventario/proveedores';
import type { Paginated } from '@/types';
import { ProveedorDeleteDialog } from './components/proveedor-delete-dialog';
import { ProveedorFormModal } from './components/proveedor-form-modal';
import { ProveedorRowActions } from './components/proveedor-row-actions';
import type { Proveedor, ProveedorFilters, ProveedorStats } from './types';

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; proveedor: Proveedor }
    | { type: 'delete'; proveedor: Proveedor };

export default function Index({
    proveedores: paginated,
    filters,
    stats,
}: {
    proveedores: Paginated<Proveedor>;
    filters: ProveedorFilters;
    stats: ProveedorStats;
}) {
    const { can } = usePermission();
    const canCreate = can('proveedores.create');
    const canUpdate = can('proveedores.update');
    const canDelete = can('proveedores.delete');
    const showRowActions = canUpdate || canDelete;

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: ProveedorFilters['estado'] }>({
            routeUrl: proveedores.index().url,
            initialFilters: filters,
            only: ['proveedores', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar los proveedores.',
            storageKey: 'tallersaas.inventario-proveedores.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openEdit = useCallback(
        (proveedor: Proveedor) => setModal({ type: 'edit', proveedor }),
        [],
    );
    const openDelete = useCallback(
        (proveedor: Proveedor) => setModal({ type: 'delete', proveedor }),
        [],
    );

    const columns = useMemo<DataTableColumn<Proveedor>[]>(() => {
        const base: DataTableColumn<Proveedor>[] = [
            {
                key: 'razon_social',
                header: 'Proveedor',
                sortable: true,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.razon_social}</span>
                        <span className="text-xs text-muted-foreground">
                            {row.email ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'ruc',
                header: 'RUC',
                sortable: true,
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">{row.ruc}</span>
                ),
            },
            {
                key: 'telefono',
                header: 'Teléfono',
                cell: (row) => <span className="text-sm">{row.telefono ?? '—'}</span>,
            },
            {
                key: 'activo',
                header: 'Estado',
                sortable: true,
                cell: (row) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.activo
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-stone-100 text-stone-600'
                        }`}
                    >
                        {row.activo ? 'Activo' : 'Inactivo'}
                    </span>
                ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (row) => (
                    <div className="flex justify-end">
                        <ProveedorRowActions
                            proveedor={row}
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

    const estadoOptions: FilterChip<ProveedorFilters['estado']>[] = [
        { value: 'todas', label: 'Todos' },
        { value: 'activa', label: 'Activos' },
        { value: 'inactiva', label: 'Inactivos' },
    ];

    const activeFiltersCount = filters.estado !== 'todas' ? 1 : 0;

    return (
        <>
            <Head title="Proveedores" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Proveedores"
                    description="Empresas y personas que abastecen repuestos al taller."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Truck },
                        {
                            label: 'Activos',
                            value: stats.activos,
                            variant: 'primary',
                            icon: Truck,
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
                        <Can permission="proveedores.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" />
                                Nuevo proveedor
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(row) => row.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.coincidencias} proveedores encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por RUC, razón social o correo…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as ProveedorFilters['estado'] })
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
                                estado:
                                    filters.estado !== 'todas' ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Truck}
                            title="Aún no hay proveedores"
                            description="Registra el primero para asociarlo a tus compras de repuestos."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setModal({ type: 'create' })}
                                    >
                                        <Plus className="size-4" />
                                        Crear proveedor
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <ProveedorFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                proveedor={modal.type === 'edit' ? modal.proveedor : null}
            />

            <ProveedorDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                proveedor={modal.type === 'delete' ? modal.proveedor : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Inventario' },
        { title: 'Proveedores', href: '/inventario/proveedores' },
    ],
};
