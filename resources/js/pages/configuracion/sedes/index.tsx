import { Head } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Filter,
    MapPin,
    Plus,
    PowerOff,
    ScreenShare,
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
} from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import { useRowSelection } from '@/hooks/use-row-selection';
import sedes from '@/routes/configuracion/sedes';
import type { Paginated } from '@/types';
import { SedeBulkDeleteDialog } from './components/sede-bulk-delete-dialog';
import { SedeDeleteDialog } from './components/sede-delete-dialog';
import { SedeFormModal } from './components/sede-form-modal';
import { SedeRowActions } from './components/sede-row-actions';
import type {
    GeoOption,
    Sede,
    SedeEstadoFilter,
    SedeFilters,
    SedeStats,
} from './types';

type SedesIndexProps = {
    sedes: Paginated<Sede>;
    filters: SedeFilters;
    stats: SedeStats;
    departamentos: readonly GeoOption[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; sede: Sede }
    | { type: 'delete'; sede: Sede }
    | { type: 'bulk-delete' };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO: SedeEstadoFilter = 'todas';

export default function Index({
    sedes: paginated,
    filters,
    stats,
    departamentos,
}: SedesIndexProps) {
    const { can } = usePermission();
    const canCreate = can('sedes.create');
    const canUpdate = can('sedes.update');
    const canDelete = can('sedes.delete');
    const canBulkDelete = can('sedes.bulk-delete');
    const showRowActions = canUpdate || canDelete;

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: SedeEstadoFilter }>({
            routeUrl: sedes.index().url,
            initialFilters: filters,
            only: ['sedes', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar la lista de sedes.',
            storageKey: 'tallersaas.sedes.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const estadoOptions: readonly FilterChip<SedeEstadoFilter>[] = useMemo(
        () => [
            { value: 'todas', label: 'Todas', description: 'Activas e inactivas' },
            { value: 'activa', label: 'Activas' },
            { value: 'inactiva', label: 'Inactivas' },
        ],
        [],
    );

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openEdit = useCallback(
        (sede: Sede) => setModal({ type: 'edit', sede }),
        [],
    );
    const openDelete = useCallback(
        (sede: Sede) => setModal({ type: 'delete', sede }),
        [],
    );
    const openBulkDelete = useCallback(() => setModal({ type: 'bulk-delete' }), []);

    const selection = useRowSelection<Sede, string | number>({
        rows: paginated.data,
        rowKey: (sede) => sede.id,
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
        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }

        return count;
    }, [filters.search, filters.sort, filters.per_page, filters.estado]);

    const columns = useMemo<DataTableColumn<Sede>[]>(() => {
        const base: DataTableColumn<Sede>[] = [
            {
                key: 'nombre',
                header: 'Sede',
                sortable: true,
                cell: (sede) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{sede.nombre}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {sede.codigo}
                        </span>
                    </div>
                ),
            },
            {
                key: 'distrito',
                header: 'Ubicación',
                sortable: true,
                cell: (sede) =>
                    sede.distrito ? (
                        <div className="flex flex-col">
                            <span className="text-sm">{sede.distrito}</span>
                            <span className="text-xs text-muted-foreground">
                                {[sede.provincia, sede.departamento]
                                    .filter(Boolean)
                                    .join(', ')}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'telefono',
                header: 'Teléfono',
                sortable: true,
                cell: (sede) =>
                    sede.telefono ? (
                        <span className="text-sm tabular-nums">{sede.telefono}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'activa',
                header: 'Estado',
                sortable: true,
                cell: (sede) =>
                    sede.activa ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="size-3.5" strokeWidth={2.25} />
                            Activa
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <PowerOff className="size-3.5" strokeWidth={2.25} />
                            Inactiva
                        </span>
                    ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (sede: Sede) => (
                    <div className="flex justify-end">
                        <SedeRowActions
                            sede={sede}
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
            <Head title="Sedes" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Sedes"
                    description="Sucursales del taller, con distrito, provincia y departamento."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Building2 },
                        { label: 'Activas', value: stats.activas, variant: 'success', icon: MapPin },
                        { label: 'Filtros', value: activeFiltersCount, variant: 'warning', icon: Filter },
                        { label: 'Coincidencias', value: stats.coincidencias, variant: 'primary', icon: ScreenShare },
                    ]}
                    action={
                        <Can permission="sedes.create">
                            <Button
                                type="button"
                                onClick={openCreate}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">Nueva sede</span>
                                <span className="sm:hidden">Nueva</span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(sede) => sede.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    selection={canBulkDelete ? selection : undefined}
                    ariaLiveMessage={`${stats.coincidencias} sedes encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por nombre, código o distrito…"
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
                                estado: filters.estado !== DEFAULT_ESTADO ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Building2}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay sedes'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba ajustando la búsqueda o los filtros.'
                                    : 'Crea la primera sede para poder registrar órdenes de trabajo.'
                            }
                            action={
                                activeFiltersCount === 0 && canCreate ? (
                                    <Button
                                        type="button"
                                        onClick={openCreate}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus className="size-4" strokeWidth={2.5} />
                                        Crear la primera sede
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <SedeFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                sede={modal.type === 'edit' ? modal.sede : null}
                departamentos={departamentos}
            />

            <SedeDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                sede={modal.type === 'delete' ? modal.sede : null}
            />

            <SedeBulkDeleteDialog
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
                    labels={{ singular: 'sede seleccionada', plural: 'sedes seleccionadas' }}
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
                        <span className="hidden sm:inline">Eliminar seleccionadas</span>
                    </BulkAction>
                </BulkActionBar>
            )}
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Configuración' },
        { title: 'Sedes', href: sedes.index().url },
    ],
};
