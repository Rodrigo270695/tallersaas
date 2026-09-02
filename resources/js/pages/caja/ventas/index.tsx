import { Head, router } from '@inertiajs/react';
import { Filter, Receipt, RefreshCw, ScreenShare, Wallet } from 'lucide-react';
import { useMemo } from 'react';
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
import ventas from '@/routes/caja/ventas';
import documentos from '@/routes/facturacion/documentos';
import type { Paginated } from '@/types';
import type { Venta, VentaEstado, VentaFilters, VentaStats } from './types';

type IndexProps = {
    ventas: Paginated<Venta>;
    filters: VentaFilters;
    stats: VentaStats;
};

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO = 'todas';

const money = (value: string | number): string =>
    Number(value).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

const METODO_LABEL: Record<string, string> = {
    efectivo: 'Efectivo',
    yape: 'Yape',
    plin: 'Plin',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    mixto: 'Mixto',
};

export default function Index({
    ventas: paginated,
    filters,
    stats,
}: IndexProps) {
    const { can } = usePermission();
    const canEmitir = can('documentos.create');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: VentaFilters['estado'] }>({
            routeUrl: ventas.index().url,
            initialFilters: filters,
            only: ['ventas', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar las ventas.',
            storageKey: 'tallersaas.ventas.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) {
            count += 1;
        }
        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }

        return count;
    }, [filters.search, filters.estado]);

    const estadoOptions: FilterChip[] = [
        { value: 'todas', label: 'Todas' },
        { value: 'pagado', label: 'Pagadas' },
        { value: 'anulado', label: 'Anuladas' },
    ];

    const columns = useMemo<DataTableColumn<Venta>[]>(
        () => [
            {
                key: 'numero',
                header: 'Número',
                sortable: true,
                cell: (venta) => (
                    <div className="flex flex-col">
                        <span className="font-mono text-sm font-medium">{venta.numero}</span>
                        <span className="text-xs text-muted-foreground">
                            {venta.orden_trabajo?.numero ?? 'Sin OT'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'cliente',
                header: 'Cliente',
                cell: (venta) => (
                    <div className="flex flex-col">
                        <span className="text-sm">
                            {venta.cliente
                                ? `${venta.cliente.nombres} ${venta.cliente.apellidos ?? ''}`
                                : '—'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {venta.vehiculo?.placa ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'total',
                header: 'Total',
                sortable: true,
                cell: (venta) => (
                    <span className="tabular-nums font-medium">{money(venta.total)}</span>
                ),
            },
            {
                key: 'metodo_pago',
                header: 'Pago',
                cell: (venta) => (
                    <span className="text-sm">
                        {METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}
                    </span>
                ),
            },
            {
                key: 'fecha_pago',
                header: 'Fecha',
                sortable: true,
                cell: (venta) => (
                    <span className="text-sm text-muted-foreground">
                        {venta.fecha_pago
                            ? new Date(venta.fecha_pago).toLocaleString('es-PE')
                            : '—'}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (venta) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            venta.estado === 'pagado'
                                ? 'bg-emerald-50 text-emerald-800'
                                : venta.estado === 'anulado'
                                  ? 'bg-rose-50 text-rose-800'
                                  : 'bg-amber-50 text-amber-800'
                        }`}
                    >
                        {venta.estado === 'pagado'
                            ? 'Pagada'
                            : venta.estado === 'anulado'
                              ? 'Anulada'
                              : venta.estado}
                    </span>
                ),
            },
            {
                key: 'fel',
                header: 'SUNAT',
                cell: (venta) => {
                    const tipo =
                        venta.tipo_comprobante_sunat === 1
                            ? 'Factura'
                            : venta.tipo_comprobante_sunat === 2
                              ? 'Boleta'
                              : 'Ticket';
                    const fel =
                        venta.fel_estado === 'emitido'
                            ? 'Emitido'
                            : venta.fel_estado === 'rechazado'
                              ? 'Rechazado'
                              : venta.fel_estado === 'pendiente'
                                ? 'Pendiente'
                                : tipo === 'Ticket'
                                  ? '—'
                                  : 'Sin emitir';
                    const puedeEmitir =
                        canEmitir &&
                        venta.estado === 'pagado' &&
                        (venta.tipo_comprobante_sunat === 1 || venta.tipo_comprobante_sunat === 2) &&
                        venta.fel_estado !== 'emitido';

                    return (
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">{tipo}</span>
                            <span
                                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                                    venta.fel_estado === 'emitido'
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : venta.fel_estado === 'rechazado'
                                          ? 'bg-rose-50 text-rose-800'
                                          : 'bg-stone-100 text-stone-600'
                                }`}
                            >
                                {fel}
                            </span>
                            {puedeEmitir && (
                                <Can permission="documentos.create">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 cursor-pointer gap-1 px-2"
                                        onClick={() =>
                                            router.post(
                                                documentos.emitir(venta.id).url,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <RefreshCw className="size-3" />
                                        Emitir
                                    </Button>
                                </Can>
                            )}
                        </div>
                    );
                },
            },
        ],
        [canEmitir],
    );

    return (
        <>
            <Head title="Ventas" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Ventas"
                    description="Cobros registrados desde las órdenes de trabajo."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Receipt },
                        { label: 'Pagadas', value: stats.pagadas, variant: 'primary', icon: Wallet },
                        { label: 'Filtros', value: activeFiltersCount, variant: 'warning', icon: Filter },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(venta) => venta.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.coincidencias} ventas encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por número, cliente u OT…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as VentaEstado | 'todas' })
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
                                    filters.estado !== DEFAULT_ESTADO
                                        ? filters.estado
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Receipt}
                            title={
                                activeFiltersCount > 0 ? 'Sin resultados' : 'Aún no hay ventas'
                            }
                            description="Cobra una orden de trabajo para registrar la primera venta."
                        />
                    }
                />
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Caja' }, { title: 'Ventas', href: '/caja/ventas' }],
};
