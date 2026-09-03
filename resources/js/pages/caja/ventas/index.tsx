import { Head, Link, router } from '@inertiajs/react';
import { Eye, Filter, Plus, Receipt, RefreshCw, ScreenShare, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { Can } from '@/components/can';
import { DateRangeFilter } from '@/components/date-range-filter';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import {
    felEstadoBadgeClass,
    statusPillClass,
    ventaEstadoBadgeClass,
} from '@/lib/status-badge';
import ventas from '@/routes/caja/ventas';
import documentos from '@/routes/facturacion/documentos';
import type { Paginated } from '@/types';
import type {
    Venta,
    VentaEstado,
    VentaFilters,
    VentaFiltroUi,
    VentaStats,
} from './types';

type IndexProps = {
    ventas: Paginated<Venta>;
    filters: VentaFilters;
    venta_filtro_ui: VentaFiltroUi;
    stats: VentaStats;
    mi_sesion_abierta?: { id: string } | null;
};

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO = 'todas';
const DEFAULT_METODO = 'todos';
const DEFAULT_TIPO = 'todos';

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
    venta_filtro_ui: ventaFiltroUi,
    stats,
    mi_sesion_abierta: miSesion = null,
}: IndexProps) {
    const { can } = usePermission();
    const canEmitir = can('documentos.create');
    const canCreate = can('ventas.create');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: VentaFilters['estado'];
            metodo_pago: VentaFilters['metodo_pago'];
            tipo_comprobante: VentaFilters['tipo_comprobante'];
            fecha_desde: string;
            fecha_hasta: string;
        }>({
            routeUrl: ventas.index().url,
            initialFilters: filters,
            only: ['ventas', 'filters', 'stats', 'venta_filtro_ui'],
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
        if (filters.metodo_pago !== DEFAULT_METODO) {
            count += 1;
        }
        if (filters.tipo_comprobante !== DEFAULT_TIPO) {
            count += 1;
        }
        if (
            filters.fecha_desde !== ventaFiltroUi.default_desde ||
            filters.fecha_hasta !== ventaFiltroUi.default_hasta
        ) {
            count += 1;
        }

        return count;
    }, [filters, ventaFiltroUi.default_desde, ventaFiltroUi.default_hasta]);

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
                        <Link
                            href={ventas.show.url(venta.id)}
                            className="font-mono text-sm font-medium text-brand-700 hover:underline"
                        >
                            {venta.numero}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                            {venta.orden_trabajo?.numero ?? 'Sin OT'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'fecha_pago',
                header: 'Fecha',
                sortable: true,
                cell: (venta) => (
                    <span className="text-sm text-muted-foreground">
                        {venta.fecha_pago
                            ? new Date(venta.fecha_pago).toLocaleString('es-PE', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                              })
                            : '—'}
                    </span>
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
                key: 'sede',
                header: 'Sede',
                cell: (venta) => (
                    <span className="text-sm text-muted-foreground">
                        {venta.sede?.nombre ?? '—'}
                    </span>
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
                header: 'Método',
                cell: (venta) => (
                    <span className="text-sm">
                        {METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (venta) => (
                    <span
                        className={`${statusPillClass} ${
                            ventaEstadoBadgeClass[venta.estado] ??
                            ventaEstadoBadgeClass.pendiente
                        }`}
                    >
                        {venta.estado === 'pagado'
                            ? 'Pagado'
                            : venta.estado === 'anulado'
                              ? 'Anulado'
                              : venta.estado === 'parcial'
                                ? 'Parcial'
                                : 'Pendiente'}
                    </span>
                ),
            },
            {
                key: 'fel',
                header: 'SUNAT / CPE',
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
                                  ? 'Sin comprobante'
                                  : 'Sin emitir';
                    const puedeEmitir =
                        canEmitir &&
                        venta.estado === 'pagado' &&
                        (venta.tipo_comprobante_sunat === 1 ||
                            venta.tipo_comprobante_sunat === 2) &&
                        venta.fel_estado !== 'emitido';

                    return (
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">{tipo}</span>
                            <span
                                className={`${statusPillClass} ${
                                    venta.fel_estado === 'emitido'
                                        ? felEstadoBadgeClass.emitido
                                        : venta.fel_estado === 'rechazado'
                                          ? felEstadoBadgeClass.rechazado
                                          : venta.fel_estado === 'pendiente'
                                            ? felEstadoBadgeClass.pendiente
                                            : felEstadoBadgeClass.default
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
            {
                key: 'detalle',
                header: 'Detalle',
                cell: (venta) => (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 cursor-pointer text-brand-700"
                        asChild
                    >
                        <Link href={ventas.show.url(venta.id)} aria-label={`Ver ${venta.numero}`}>
                            <Eye className="size-4" strokeWidth={2.25} />
                        </Link>
                    </Button>
                ),
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
                    description="Historial de ventas registradas en caja: totales, cliente y estado de comprobante electrónico (SUNAT)."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Receipt },
                        { label: 'Pagadas', value: stats.pagadas, variant: 'primary', icon: Wallet },
                        { label: 'Anuladas', value: stats.anuladas, variant: 'warning', icon: Filter },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        canCreate ? (
                            <Button asChild className="cursor-pointer gap-2">
                                <Link href={ventas.create().url}>
                                    <Plus className="size-4" strokeWidth={2.5} />
                                    Nueva venta
                                </Link>
                            </Button>
                        ) : undefined
                    }
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
                            <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
                                <FilterChips
                                    ariaLabel="Filtrar por estado"
                                    value={filters.estado}
                                    onChange={(estado) =>
                                        applyFilter({ estado: estado as VentaEstado | 'todas' })
                                    }
                                    options={estadoOptions}
                                />
                                <Select
                                    value={filters.tipo_comprobante}
                                    onValueChange={(value) =>
                                        applyFilter({
                                            tipo_comprobante:
                                                value as VentaFilters['tipo_comprobante'],
                                        })
                                    }
                                    disabled={isLoading}
                                >
                                    <SelectTrigger
                                        className="h-9 w-[10.5rem]"
                                        aria-label="Tipo de comprobante"
                                    >
                                        <SelectValue placeholder="Comprobante" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos los comprobantes</SelectItem>
                                        <SelectItem value="ticket">Ticket</SelectItem>
                                        <SelectItem value="boleta">Boleta</SelectItem>
                                        <SelectItem value="factura">Factura</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.metodo_pago}
                                    onValueChange={(value) =>
                                        applyFilter({ metodo_pago: value })
                                    }
                                    disabled={isLoading}
                                >
                                    <SelectTrigger
                                        className="h-9 w-[10.5rem]"
                                        aria-label="Método de pago"
                                    >
                                        <SelectValue placeholder="Método" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos los métodos</SelectItem>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                        <SelectItem value="yape">Yape</SelectItem>
                                        <SelectItem value="plin">Plin</SelectItem>
                                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                        <SelectItem value="transferencia">
                                            Transferencia
                                        </SelectItem>
                                        <SelectItem value="mixto">Mixto</SelectItem>
                                    </SelectContent>
                                </Select>
                                <DateRangeFilter
                                    desde={filters.fecha_desde}
                                    hasta={filters.fecha_hasta}
                                    defaultDesde={ventaFiltroUi.default_desde}
                                    defaultHasta={ventaFiltroUi.default_hasta}
                                    timeZone={ventaFiltroUi.timezone}
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
                                estado:
                                    filters.estado !== DEFAULT_ESTADO
                                        ? filters.estado
                                        : undefined,
                                metodo_pago:
                                    filters.metodo_pago !== DEFAULT_METODO
                                        ? filters.metodo_pago
                                        : undefined,
                                tipo_comprobante:
                                    filters.tipo_comprobante !== DEFAULT_TIPO
                                        ? filters.tipo_comprobante
                                        : undefined,
                                fecha_desde: filters.fecha_desde,
                                fecha_hasta: filters.fecha_hasta,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Receipt}
                            title={
                                activeFiltersCount > 0 ? 'Sin resultados' : 'Aún no hay ventas'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba con otros filtros.'
                                    : miSesion
                                      ? 'Usa «Nueva venta» para una compra de mostrador, o cobra desde una OT.'
                                      : 'Abre una sesión de caja y luego registra una venta.'
                            }
                            action={
                                canCreate ? (
                                    <Button asChild className="cursor-pointer gap-2">
                                        <Link href={ventas.create().url}>
                                            <Plus className="size-4" />
                                            Nueva venta
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
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
