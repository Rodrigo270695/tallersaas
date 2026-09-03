import { Head } from '@inertiajs/react';
import {
    ClipboardList,
    Filter,
    Plus,
    ScreenShare,
    Trash2,
    Wrench,
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
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import type { Paginated } from '@/types';
import { OrdenAvisarListaModal } from './components/orden-avisar-lista-modal';
import { OrdenBulkDeleteDialog } from './components/orden-bulk-delete-dialog';
import { OrdenCobroModal } from './components/orden-cobro-modal';
import { OrdenDeleteDialog } from './components/orden-delete-dialog';
import { OrdenFormModal } from './components/orden-form-modal';
import { OrdenRowActions } from './components/orden-row-actions';
import type {
    ClienteOption,
    MiSesionAbierta,
    OrdenEstado,
    OrdenEstadoFilter,
    OrdenFilters,
    OrdenIgv,
    OrdenStats,
    OrdenTrabajo,
    ProductoCobroOption,
    ServicioCobroOption,
    SedeOption,
    VehiculoOption,
} from './types';

type IndexProps = {
    ordenes: Paginated<OrdenTrabajo>;
    filters: OrdenFilters;
    stats: OrdenStats;
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    mi_sesion_abierta: MiSesionAbierta;
    igv: OrdenIgv;
    fel_ready?: boolean;
    taller_nombre?: string;
    productos: readonly ProductoCobroOption[];
    servicios: readonly ServicioCobroOption[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; orden: OrdenTrabajo }
    | { type: 'delete'; orden: OrdenTrabajo }
    | { type: 'cobrar'; orden: OrdenTrabajo }
    | { type: 'avisar'; orden: OrdenTrabajo }
    | { type: 'bulk-delete' };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO: OrdenEstadoFilter = 'todas';

const ESTADO_LABEL: Record<OrdenEstado, string> = {
    abierta: 'Abierta',
    en_proceso: 'En proceso',
    lista: 'Lista',
    entregada: 'Entregada',
    anulada: 'Anulada',
};

const estadoClass: Record<OrdenEstado, string> = {
    abierta: 'bg-sky-50 text-sky-800',
    en_proceso: 'bg-amber-50 text-amber-800',
    lista: 'bg-emerald-50 text-emerald-800',
    entregada: 'bg-stone-100 text-stone-600',
    anulada: 'bg-rose-50 text-rose-800',
};

export default function Index({
    ordenes: paginated,
    filters,
    stats,
    sedes,
    clientes,
    vehiculos,
    mi_sesion_abierta: miSesion,
    igv,
    taller_nombre: tallerNombre = 'el taller',
    productos = [],
    servicios = [],
    fel_ready: felReady = false,
}: IndexProps) {
    const { can } = usePermission();
    const canCreate = can('ordenes-trabajo.create');
    const canUpdate = can('ordenes-trabajo.update');
    const canDelete = can('ordenes-trabajo.delete');
    const canBulkDelete = can('ordenes-trabajo.delete');
    const canCobrar = can('ventas.create');
    const canPresupuesto = can('cotizaciones.create');
    const showRowActions = canUpdate || canDelete || canCobrar || canPresupuesto;

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: OrdenEstadoFilter }>({
            routeUrl: ordenesTrabajo.index().url,
            initialFilters: filters,
            only: ['ordenes', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar la lista de órdenes.',
            storageKey: 'tallersaas.ordenes.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const estadoOptions: readonly FilterChip<OrdenEstadoFilter>[] = useMemo(
        () => [
            { value: 'todas', label: 'Todas' },
            { value: 'abierta', label: 'Abiertas' },
            { value: 'en_proceso', label: 'En proceso' },
            { value: 'lista', label: 'Listas' },
            { value: 'entregada', label: 'Entregadas' },
            { value: 'anulada', label: 'Anuladas' },
        ],
        [],
    );

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openEdit = useCallback(
        (orden: OrdenTrabajo) => setModal({ type: 'edit', orden }),
        [],
    );
    const openDelete = useCallback(
        (orden: OrdenTrabajo) => setModal({ type: 'delete', orden }),
        [],
    );
    const openCobrar = useCallback(
        (orden: OrdenTrabajo) => setModal({ type: 'cobrar', orden }),
        [],
    );
    const openAvisar = useCallback(
        (orden: OrdenTrabajo) => setModal({ type: 'avisar', orden }),
        [],
    );
    const openBulkDelete = useCallback(() => setModal({ type: 'bulk-delete' }), []);

    const selection = useRowSelection<OrdenTrabajo, string | number>({
        rows: paginated.data,
        rowKey: (orden) => orden.id,
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

    const columns = useMemo<DataTableColumn<OrdenTrabajo>[]>(() => {
        const base: DataTableColumn<OrdenTrabajo>[] = [
            {
                key: 'numero',
                header: 'Número',
                sortable: true,
                cell: (orden) => (
                    <div className="flex flex-col">
                        <span className="font-mono text-sm font-medium">{orden.numero}</span>
                        <span className="text-xs text-muted-foreground">
                            {orden.sede?.nombre ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'cliente',
                header: 'Cliente / vehículo',
                cell: (orden) => (
                    <div className="flex flex-col">
                        <span className="text-sm">
                            {orden.cliente
                                ? `${orden.cliente.nombres} ${orden.cliente.apellidos ?? ''}`
                                : '—'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {orden.vehiculo?.placa ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (orden) => (
                    <div className="flex flex-col gap-0.5">
                        <span
                            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${estadoClass[orden.estado]}`}
                        >
                            {ESTADO_LABEL[orden.estado]}
                        </span>
                        {orden.estado === 'lista' && !orden.lista_notificada_at && (
                            <span className="text-[11px] text-amber-700">Sin avisar</span>
                        )}
                    </div>
                ),
            },
            {
                key: 'solicitud_cliente',
                header: 'Solicitud',
                cell: (orden) => (
                    <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">
                        {orden.solicitud_cliente || '—'}
                    </span>
                ),
            },
            {
                key: 'total',
                header: 'Saldo',
                sortable: true,
                cell: (orden) => (
                    <div className="flex flex-col tabular-nums">
                        <span className="text-sm font-medium">
                            {Number(orden.saldo ?? 0).toLocaleString('es-PE', {
                                style: 'currency',
                                currency: 'PEN',
                            })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Total{' '}
                            {Number(orden.total ?? 0).toLocaleString('es-PE', {
                                style: 'currency',
                                currency: 'PEN',
                            })}
                        </span>
                    </div>
                ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (orden: OrdenTrabajo) => (
                    <div className="flex justify-end">
                        <OrdenRowActions
                            orden={orden}
                            onEdit={openEdit}
                            onDelete={openDelete}
                            onCobrar={openCobrar}
                            onAvisar={openAvisar}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            canCobrar={canCobrar}
                            canPresupuesto={canPresupuesto}
                        />
                    </div>
                ),
                className: 'w-12',
            });
        }

        return base;
    }, [showRowActions, canUpdate, canDelete, canCobrar, openEdit, openDelete, openCobrar, openAvisar]);

    return (
        <>
            <Head title="Órdenes de trabajo" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Órdenes de trabajo"
                    description="Recepción, diagnóstico y seguimiento de los vehículos en taller."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: ClipboardList },
                        { label: 'Abiertas', value: stats.abiertas, variant: 'warning', icon: Wrench },
                        { label: 'Filtros', value: activeFiltersCount, variant: 'warning', icon: Filter },
                        { label: 'Coincidencias', value: stats.coincidencias, variant: 'primary', icon: ScreenShare },
                    ]}
                    action={
                        <Can permission="ordenes-trabajo.create">
                            <Button
                                type="button"
                                onClick={openCreate}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">Nueva orden</span>
                                <span className="sm:hidden">Nueva</span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(orden) => orden.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    selection={canBulkDelete ? selection : undefined}
                    ariaLiveMessage={`${stats.coincidencias} órdenes encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por número, placa o cliente…"
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
                            icon={ClipboardList}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay órdenes de trabajo'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba ajustando la búsqueda o los filtros.'
                                    : sedes.length === 0
                                      ? 'Crea una sede antes de registrar la primera orden.'
                                      : 'Registra la primera orden para empezar el flujo del taller.'
                            }
                            action={
                                activeFiltersCount === 0 && canCreate ? (
                                    <Button
                                        type="button"
                                        onClick={openCreate}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus className="size-4" strokeWidth={2.5} />
                                        Crear la primera orden
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <OrdenFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                orden={modal.type === 'edit' ? modal.orden : null}
                sedes={sedes}
                clientes={clientes}
                vehiculos={vehiculos}
                servicios={servicios}
                productos={productos}
                canUpdate={canUpdate}
            />

            <OrdenDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                orden={modal.type === 'delete' ? modal.orden : null}
            />

            <OrdenCobroModal
                open={modal.type === 'cobrar'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                orden={modal.type === 'cobrar' ? modal.orden : null}
                sesion={miSesion}
                igv={igv}
                productos={productos}
                servicios={servicios}
                felReady={felReady}
            />

            <OrdenAvisarListaModal
                open={modal.type === 'avisar'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                orden={modal.type === 'avisar' ? modal.orden : null}
                tallerNombre={tallerNombre}
            />

            <OrdenBulkDeleteDialog
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
                    labels={{
                        singular: 'orden seleccionada',
                        plural: 'órdenes seleccionadas',
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
                        <span className="hidden sm:inline">Eliminar seleccionadas</span>
                    </BulkAction>
                </BulkActionBar>
            )}
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Taller' },
        { title: 'Órdenes de trabajo', href: '/taller/ordenes-trabajo' },
    ],
};
