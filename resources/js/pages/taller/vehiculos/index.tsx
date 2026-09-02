import { Head } from '@inertiajs/react';
import { Car, Filter, Plus, ScreenShare, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Can } from '@/components/can';
import {
    BulkAction,
    BulkActionBar,
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    PageHeader,
} from '@/components/data-page';
import type { DataTableColumn } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import { useRowSelection } from '@/hooks/use-row-selection';
import vehiculos from '@/routes/taller/vehiculos';
import type { Paginated } from '@/types';
import { VehiculoBulkDeleteDialog } from './components/vehiculo-bulk-delete-dialog';
import { VehiculoDeleteDialog } from './components/vehiculo-delete-dialog';
import { VehiculoFormModal } from './components/vehiculo-form-modal';
import { VehiculoFotoCell } from './components/vehiculo-foto-cell';
import { VehiculoRowActions } from './components/vehiculo-row-actions';
import type {
    ClienteOption,
    MarcaOption,
    ModeloOption,
    Vehiculo,
    VehiculoFilters,
    VehiculoStats,
} from './types';

type VehiculosIndexProps = {
    vehiculos: Paginated<Vehiculo>;
    filters: VehiculoFilters;
    stats: VehiculoStats;
    clientes: ClienteOption[];
    marcas: MarcaOption[];
    modelos: ModeloOption[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; vehiculo: Vehiculo }
    | { type: 'delete'; vehiculo: Vehiculo }
    | { type: 'bulk-delete' };

const DEFAULT_PER_PAGE = 10;

/**
 * Página principal del módulo Vehículos (Taller → Vehículos).
 */
export default function Index({
    vehiculos: paginated,
    filters,
    stats,
    clientes,
    marcas,
    modelos,
}: VehiculosIndexProps) {
    const { can } = usePermission();
    const canCreate = can('vehiculos.create');
    const canUpdate = can('vehiculos.update');
    const canDelete = can('vehiculos.delete');
    const canBulkDelete = can('vehiculos.bulk-delete');
    const showRowActions = canUpdate || canDelete;

    const { search, setSearch, isLoading, sort, setSort, setPerPage } =
        useDataTablePage({
            routeUrl: vehiculos.index().url,
            initialFilters: filters,
            only: ['vehiculos', 'filters', 'stats', 'clientes', 'marcas', 'modelos'],
            errorMessage: 'No se pudo cargar la lista de vehículos.',
            storageKey: 'tallersaas.vehiculos.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openEdit = useCallback(
        (vehiculo: Vehiculo) => setModal({ type: 'edit', vehiculo }),
        [],
    );
    const openDelete = useCallback(
        (vehiculo: Vehiculo) => setModal({ type: 'delete', vehiculo }),
        [],
    );
    const openBulkDelete = useCallback(() => setModal({ type: 'bulk-delete' }), []);

    const selection = useRowSelection<Vehiculo, string | number>({
        rows: paginated.data,
        rowKey: (vehiculo) => vehiculo.id,
    });

    const activeFiltersCount = useMemo(() => {
        let count = 0;

        if (filters.search) {
count += 1;
}

        if (filters.sort) {
count += 1;
}

        if (filters.per_page !== DEFAULT_PER_PAGE) {
count += 1;
}

        return count;
    }, [filters.search, filters.sort, filters.per_page]);

    const columns = useMemo<DataTableColumn<Vehiculo>[]>(() => {
        const base: DataTableColumn<Vehiculo>[] = [
            {
                key: 'foto',
                header: 'Foto',
                cell: (vehiculo) => (
                    <VehiculoFotoCell
                        fotoUrl={vehiculo.foto_url}
                        etiqueta={
                            [vehiculo.placa, vehiculo.marca?.nombre, vehiculo.modelo?.nombre]
                                .filter(Boolean)
                                .join(' · ') || vehiculo.placa
                        }
                    />
                ),
                className: 'w-14',
            },
            {
                key: 'placa',
                header: 'Placa',
                sortable: true,
                cell: (vehiculo) => (
                    <span className="font-mono text-sm font-semibold tracking-wide">
                        {vehiculo.placa}
                    </span>
                ),
            },
            {
                key: 'marca',
                header: 'Vehículo',
                cell: (vehiculo) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                            {[vehiculo.marca?.nombre, vehiculo.modelo?.nombre].filter(Boolean).join(' ') || '—'}
                        </span>
                        {vehiculo.color ? (
                            <span className="text-xs text-muted-foreground">{vehiculo.color}</span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'cliente',
                header: 'Cliente',
                cell: (vehiculo) =>
                    vehiculo.cliente ? (
                        <span className="text-sm">
                            {vehiculo.cliente.nombres} {vehiculo.cliente.apellidos}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'anio',
                header: 'Año',
                sortable: true,
                cell: (vehiculo) =>
                    vehiculo.anio != null ? (
                        <span className="text-sm tabular-nums">{vehiculo.anio}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'kilometraje',
                header: 'Kilometraje',
                cell: (vehiculo) =>
                    vehiculo.kilometraje != null ? (
                        <span className="text-sm tabular-nums">
                            {vehiculo.kilometraje.toLocaleString('es-PE')} km
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'activo',
                header: 'Estado',
                cell: (vehiculo) =>
                    vehiculo.activo ? (
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
                cell: (vehiculo: Vehiculo) => (
                    <div className="flex justify-end">
                        <VehiculoRowActions
                            vehiculo={vehiculo}
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
            <Head title="Vehículos" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Vehículos"
                    description="Administra los vehículos registrados por tus clientes."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Car },
                        { label: 'Filtros', value: activeFiltersCount, variant: 'warning', icon: Filter },
                        { label: 'Coincidencias', value: stats.coincidencias, variant: 'primary', icon: ScreenShare },
                    ]}
                    action={
                        <Can permission="vehiculos.create">
                            <Button
                                type="button"
                                onClick={openCreate}
                                disabled={clientes.length === 0}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">Nuevo vehículo</span>
                                <span className="sm:hidden">Nuevo</span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(vehiculo) => vehiculo.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    selection={canBulkDelete ? selection : undefined}
                    ariaLiveMessage={`${stats.coincidencias} vehículos encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por placa, marca, modelo o cliente…"
                        />
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
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Car}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay vehículos'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba ajustando la búsqueda o los filtros.'
                                    : clientes.length === 0
                                        ? 'Registra primero un cliente para poder añadir vehículos.'
                                        : 'Registra el primer vehículo de un cliente.'
                            }
                            action={
                                activeFiltersCount === 0 && canCreate && clientes.length > 0 ? (
                                    <Button
                                        type="button"
                                        onClick={openCreate}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus className="size-4" strokeWidth={2.5} />
                                        Crear el primer vehículo
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <VehiculoFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
closeModal();
}
                }}
                vehiculo={modal.type === 'edit' ? modal.vehiculo : null}
                clientes={clientes}
                marcas={marcas}
                modelos={modelos}
            />

            <VehiculoDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
closeModal();
}
                }}
                vehiculo={modal.type === 'delete' ? modal.vehiculo : null}
            />

            <VehiculoBulkDeleteDialog
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
                    labels={{ singular: 'vehículo seleccionado', plural: 'vehículos seleccionados' }}
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
        { title: 'Vehículos', href: vehiculos.index().url },
    ],
};
