import { Head } from '@inertiajs/react';
import { Filter, Plus, ScreenShare, ShoppingCart } from 'lucide-react';
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
import { DateRangeFilter } from '@/components/date-range-filter';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import compras from '@/routes/inventario/compras';
import type { Paginated } from '@/types';
import { CompraAnularDialog } from './components/compra-anular-dialog';
import { CompraFormModal } from './components/compra-form-modal';
import { CompraRowActions } from './components/compra-row-actions';
import type {
    Compra,
    CompraFilters,
    CompraFiltroUi,
    CompraStats,
    ProductoOption,
    ProveedorOption,
    SedeOption,
    UnidadOption,
} from './types';

type ModalState = { type: 'idle' } | { type: 'create' } | { type: 'anular'; compra: Compra };

const ALL_SEDES = '__todas__';

const money = (value: string | number | null): string => {
    if (value === null || value === '') {
        return '—';
    }

    return Number(value).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
};

export default function Index({
    compras: paginated,
    filters,
    compra_filtro_ui: compraFiltroUi,
    stats,
    sede_options: sedes,
    proveedor_options: proveedores,
    producto_options: productos,
    unidad_options: unidades,
}: {
    compras: Paginated<Compra>;
    filters: CompraFilters;
    compra_filtro_ui: CompraFiltroUi;
    stats: CompraStats;
    sede_options: readonly SedeOption[];
    proveedor_options: readonly ProveedorOption[];
    producto_options: readonly ProductoOption[];
    unidad_options: readonly UnidadOption[];
}) {
    const { can } = usePermission();
    const canCreate = can('compras.create');
    const canDelete = can('compras.delete');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: CompraFilters['estado'];
            sede_id: string;
            proveedor_id: string;
            fecha_desde: string;
            fecha_hasta: string;
        }>({
            routeUrl: compras.index().url,
            initialFilters: filters,
            only: ['compras', 'filters', 'stats', 'compra_filtro_ui'],
            errorMessage: 'No se pudo cargar las compras.',
            storageKey: 'tallersaas.inventario-compras.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openAnular = useCallback((compra: Compra) => setModal({ type: 'anular', compra }), []);

    const proveedorFilterOptions = useMemo<readonly ComboboxOption[]>(
        () => proveedores.map((p) => ({ value: p.id, label: `${p.razon_social} (${p.ruc})` })),
        [proveedores],
    );

    const columns = useMemo<DataTableColumn<Compra>[]>(
        () => [
            {
                key: 'fecha_documento',
                header: 'Fecha',
                sortable: true,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="text-sm">
                            {new Date(row.fecha_documento).toLocaleDateString('es-PE')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {row.tipo_comprobante === 'factura' ? 'Factura' : 'Boleta'}{' '}
                            {[row.serie, row.numero_documento].filter(Boolean).join('-') || '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'proveedor',
                header: 'Proveedor',
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">
                            {row.proveedor?.razon_social ?? 'Sin proveedor'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {row.sede_nombre ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'lineas_count',
                header: 'Líneas',
                cell: (row) => <span className="text-sm">{row.lineas_count ?? 0}</span>,
            },
            {
                key: 'total',
                header: 'Total',
                sortable: true,
                cell: (row) => (
                    <span className="tabular-nums text-sm font-medium">{money(row.total)}</span>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                cell: (row) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.deleted_at
                                ? 'bg-stone-100 text-stone-600'
                                : 'bg-emerald-50 text-emerald-800'
                        }`}
                    >
                        {row.deleted_at ? 'Anulada' : 'Activa'}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (row) => (
                    <div className="flex justify-end">
                        <CompraRowActions
                            compra={row}
                            onAnular={openAnular}
                            canDelete={canDelete}
                        />
                    </div>
                ),
                className: 'w-12',
            },
        ],
        [canDelete, openAnular],
    );

    const estadoOptions: FilterChip<CompraFilters['estado']>[] = [
        { value: 'activa', label: 'Activas' },
        { value: 'anulada', label: 'Anuladas' },
    ];

    const sedeOptions = useMemo<FilterChip<string>[]>(
        () => [
            { value: ALL_SEDES, label: 'Todas las sedes' },
            ...sedes.map((sede) => ({
                value: sede.id,
                label: sede.nombre,
            })),
        ],
        [sedes],
    );

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.sede_id) {
            count += 1;
        }
        if (filters.proveedor_id) {
            count += 1;
        }
        if (
            filters.fecha_desde !== compraFiltroUi.default_desde ||
            filters.fecha_hasta !== compraFiltroUi.default_hasta
        ) {
            count += 1;
        }

        return count;
    }, [
        filters.sede_id,
        filters.proveedor_id,
        filters.fecha_desde,
        filters.fecha_hasta,
        compraFiltroUi.default_desde,
        compraFiltroUi.default_hasta,
    ]);

    return (
        <>
            <Head title="Compras" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Compras"
                    description="Registra compras a proveedores: el stock se actualiza automáticamente."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: ShoppingCart },
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
                        <Can permission="compras.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" />
                                Nueva compra
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
                    ariaLiveMessage={`${stats.coincidencias} compras encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por serie, número o proveedor…"
                        >
                            <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
                                <FilterChips
                                    ariaLabel="Filtrar por estado"
                                    value={filters.estado}
                                    onChange={(estado) =>
                                        applyFilter({ estado: estado as CompraFilters['estado'] })
                                    }
                                    options={estadoOptions}
                                    disabled={isLoading}
                                />
                                {sedes.length > 0 && (
                                    <FilterChips
                                        ariaLabel="Filtrar por sede"
                                        value={filters.sede_id || ALL_SEDES}
                                        onChange={(value) =>
                                            applyFilter({
                                                sede_id: value === ALL_SEDES ? '' : value,
                                            })
                                        }
                                        options={sedeOptions}
                                        disabled={isLoading}
                                    />
                                )}
                                {proveedores.length > 0 && (
                                    <Combobox
                                        options={proveedorFilterOptions}
                                        value={filters.proveedor_id || null}
                                        onChange={(value) =>
                                            applyFilter({ proveedor_id: value ?? '' })
                                        }
                                        placeholder="Todos los proveedores"
                                        searchPlaceholder="Buscar proveedor…"
                                        emptyMessage="Sin coincidencias."
                                        clearable
                                        className="h-9 w-56"
                                    />
                                )}
                                <DateRangeFilter
                                    desde={filters.fecha_desde}
                                    hasta={filters.fecha_hasta}
                                    defaultDesde={compraFiltroUi.default_desde}
                                    defaultHasta={compraFiltroUi.default_hasta}
                                    timeZone={compraFiltroUi.timezone}
                                    disabled={isLoading}
                                    triggerClassName="h-9 min-w-[12rem]"
                                    onApply={(desde, hasta) =>
                                        applyFilter({ fecha_desde: desde, fecha_hasta: hasta })
                                    }
                                />
                            </div>
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
                                estado: filters.estado !== 'activa' ? filters.estado : undefined,
                                sede_id: filters.sede_id || undefined,
                                proveedor_id: filters.proveedor_id || undefined,
                                fecha_desde: filters.fecha_desde,
                                fecha_hasta: filters.fecha_hasta,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ShoppingCart}
                            title={
                                activeFiltersCount > 0 ? 'Sin resultados' : 'Aún no hay compras'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba ajustando la búsqueda o los filtros.'
                                    : 'Registra una compra para actualizar el stock del almacén.'
                            }
                            action={
                                activeFiltersCount === 0 && canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setModal({ type: 'create' })}
                                    >
                                        <Plus className="size-4" />
                                        Registrar compra
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <CompraFormModal
                open={modal.type === 'create'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                proveedores={proveedores}
                sedes={sedes}
                productos={productos}
                unidades={unidades}
            />

            <CompraAnularDialog
                open={modal.type === 'anular'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                compra={modal.type === 'anular' ? modal.compra : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Inventario' },
        { title: 'Compras', href: '/inventario/compras' },
    ],
};
