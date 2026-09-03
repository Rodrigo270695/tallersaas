import { Head } from '@inertiajs/react';
import { ArrowLeftRight, Filter, Plus, ScreenShare } from 'lucide-react';
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
import movimientos from '@/routes/inventario/movimientos';
import type { Paginated } from '@/types';
import { MovimientoFormModal } from './components/movimiento-form-modal';
import type {
    Movimiento,
    MovimientoFilters,
    MovimientoStats,
    MovimientoTipo,
    ProductoMovimientoOption,
    SedeOption,
} from './types';

const ALL_SEDES = '__todas__';

const TIPO_LABEL: Record<MovimientoTipo, string> = {
    entrada: 'Entrada',
    salida: 'Salida',
    merma: 'Merma',
    ajuste: 'Ajuste',
};

const tipoClass: Record<MovimientoTipo, string> = {
    entrada: 'bg-emerald-50 text-emerald-800',
    salida: 'bg-sky-50 text-sky-800',
    merma: 'bg-amber-50 text-amber-800',
    ajuste: 'bg-violet-50 text-violet-800',
};

export default function Index({
    movimientos: paginated,
    filters,
    stats,
    sede_options: sedes,
    producto_options: productos,
}: {
    movimientos: Paginated<Movimiento>;
    filters: MovimientoFilters;
    stats: MovimientoStats;
    sede_options: readonly SedeOption[];
    producto_options: readonly ProductoMovimientoOption[];
}) {
    const { can } = usePermission();
    const canCreate = can('movimientos-stock.create');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{
            tipo: MovimientoFilters['tipo'];
            sede_id: string;
        }>({
            routeUrl: movimientos.index().url,
            initialFilters: filters,
            only: ['movimientos', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar los movimientos.',
            storageKey: 'tallersaas.inventario-movimientos.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [createOpen, setCreateOpen] = useState(false);
    const closeCreate = useCallback(() => setCreateOpen(false), []);

    const columns = useMemo<DataTableColumn<Movimiento>[]>(
        () => [
            {
                key: 'created_at',
                header: 'Fecha',
                sortable: true,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="text-sm">
                            {new Date(row.created_at).toLocaleString('es-PE')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {row.creado_por?.name ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'producto',
                header: 'Repuesto',
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.producto?.nombre ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">
                            {row.sede_nombre ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'tipo',
                header: 'Tipo',
                sortable: true,
                cell: (row) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tipoClass[row.tipo]}`}
                    >
                        {TIPO_LABEL[row.tipo]}
                    </span>
                ),
            },
            {
                key: 'delta',
                header: 'Delta',
                sortable: true,
                cell: (row) => {
                    const n = Number(row.delta);
                    const sign = n > 0 ? '+' : '';

                    return (
                        <span
                            className={`tabular-nums font-medium ${n < 0 ? 'text-rose-700' : 'text-emerald-700'}`}
                        >
                            {sign}
                            {n.toLocaleString('es-PE')}
                        </span>
                    );
                },
            },
            {
                key: 'stock_despues',
                header: 'Stock',
                cell: (row) => (
                    <span className="tabular-nums text-sm">
                        {Number(row.stock_anterior).toLocaleString('es-PE')} →{' '}
                        {Number(row.stock_despues).toLocaleString('es-PE')}
                    </span>
                ),
            },
            {
                key: 'notas',
                header: 'Notas',
                cell: (row) => (
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                        {row.notas ?? '—'}
                    </span>
                ),
            },
        ],
        [],
    );

    const tipoOptions: FilterChip<MovimientoFilters['tipo']>[] = [
        { value: 'todos', label: 'Todos' },
        { value: 'entrada', label: 'Entrada' },
        { value: 'salida', label: 'Salida' },
        { value: 'merma', label: 'Merma' },
        { value: 'ajuste', label: 'Ajuste' },
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

    const activeFiltersCount =
        (filters.tipo !== 'todos' ? 1 : 0) + (filters.sede_id ? 1 : 0);

    return (
        <>
            <Head title="Movimientos" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Movimientos"
                    description="Kardex de entradas, salidas, mermas y ajustes."
                    stats={[
                        {
                            label: 'Total',
                            value: stats.total,
                            variant: 'info',
                            icon: ArrowLeftRight,
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
                        <Can permission="movimientos-stock.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setCreateOpen(true)}
                            >
                                <Plus className="size-4" />
                                Nuevo movimiento
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
                    ariaLiveMessage={`${stats.coincidencias} movimientos encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por repuesto o notas…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por tipo"
                                value={filters.tipo}
                                onChange={(tipo) =>
                                    applyFilter({
                                        tipo: tipo as MovimientoFilters['tipo'],
                                    })
                                }
                                options={tipoOptions}
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
                                />
                            )}
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
                                tipo: filters.tipo !== 'todos' ? filters.tipo : undefined,
                                sede_id: filters.sede_id || undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ArrowLeftRight}
                            title="Aún no hay movimientos"
                            description="Registra una entrada, salida o merma para ver el kardex."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setCreateOpen(true)}
                                    >
                                        <Plus className="size-4" />
                                        Registrar movimiento
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <MovimientoFormModal
                open={createOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeCreate();
                    }
                }}
                productos={productos}
                sedes={sedes}
                defaultSedeId={filters.sede_id}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Inventario' },
        { title: 'Movimientos', href: '/inventario/movimientos' },
    ],
};
