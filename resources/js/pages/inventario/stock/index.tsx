import { Head } from '@inertiajs/react';
import { Filter, ScreenShare, TriangleAlert, Warehouse } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    PageHeader,
} from '@/components/data-page';
import type { DataTableColumn } from '@/components/data-page';
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
import stock from '@/routes/inventario/stock';
import type { Paginated } from '@/types';
import { StockAdjustDialog } from './components/stock-adjust-dialog';
import type { SedeOption, StockFilters, StockProducto, StockStats } from './types';

const qty = (value: string | number | null | undefined): number => Number(value ?? 0);

export default function Index({
    productos: paginated,
    filters,
    stats,
    sede_options: sedes,
    sin_sedes: sinSedes,
}: {
    productos: Paginated<StockProducto>;
    filters: StockFilters;
    stats: StockStats;
    sede_options: readonly SedeOption[];
    sin_sedes: boolean;
}) {
    const { can } = usePermission();
    const canAdjust = can('stock.adjust');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ sede_id: string }>({
            routeUrl: stock.index().url,
            initialFilters: filters,
            only: ['productos', 'filters', 'stats', 'sin_sedes'],
            errorMessage: 'No se pudo cargar el stock.',
            storageKey: 'tallersaas.inventario-stock.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [adjusting, setAdjusting] = useState<StockProducto | null>(null);
    const closeAdjust = useCallback(() => setAdjusting(null), []);

    const sedeActual = sedes.find((sede) => sede.id === filters.sede_id);

    const columns = useMemo<DataTableColumn<StockProducto>[]>(() => {
        const base: DataTableColumn<StockProducto>[] = [
            {
                key: 'nombre',
                header: 'Repuesto',
                sortable: true,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                            {row.sku ?? 'Sin SKU'} · {row.unidad}
                        </span>
                    </div>
                ),
            },
            {
                key: 'cantidad_stock',
                header: 'Stock',
                sortable: true,
                cell: (row) => {
                    const actual = qty(row.cantidad_stock);
                    const minimo =
                        row.stock_minimo != null && String(row.stock_minimo) !== ''
                            ? qty(row.stock_minimo)
                            : null;

                    const nivel: 'ok' | 'alerta' | 'critico' | 'sin' =
                        minimo === null
                            ? actual <= 0
                                ? 'critico'
                                : 'sin'
                            : actual <= 0
                              ? 'critico'
                              : actual < minimo
                                ? 'alerta'
                                : 'ok';

                    const dotClass =
                        nivel === 'ok'
                            ? 'bg-emerald-500'
                            : nivel === 'alerta'
                              ? 'bg-amber-500'
                              : nivel === 'critico'
                                ? 'bg-red-500'
                                : 'bg-stone-300';

                    const label =
                        nivel === 'ok'
                            ? 'OK'
                            : nivel === 'alerta'
                              ? 'Bajo alerta'
                              : nivel === 'critico'
                                ? 'Sin stock'
                                : 'Sin alerta';

                    return (
                        <div className="flex items-center gap-2.5">
                            <span
                                className={`size-2.5 shrink-0 rounded-full ${dotClass}`}
                                title={label}
                                aria-label={label}
                            />
                            <div className="flex min-w-0 flex-col">
                                <span
                                    className={`tabular-nums font-medium ${
                                        nivel === 'critico'
                                            ? 'text-red-700'
                                            : nivel === 'alerta'
                                              ? 'text-amber-700'
                                              : ''
                                    }`}
                                >
                                    {actual.toLocaleString('es-PE')}
                                </span>
                                {minimo !== null ? (
                                    <span className="text-xs text-muted-foreground">
                                        Alerta {minimo.toLocaleString('es-PE')}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">{label}</span>
                                )}
                            </div>
                        </div>
                    );
                },
            },
        ];

        if (canAdjust) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (row) => (
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => setAdjusting(row)}
                        >
                            Ajustar
                        </Button>
                    </div>
                ),
            });
        }

        return base;
    }, [canAdjust]);

    return (
        <>
            <Head title="Stock" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Stock"
                    description="Existencias por sede. El ajuste deja la cantidad exacta (kardex de ajuste)."
                    stats={[
                        { label: 'Repuestos', value: stats.total, variant: 'info', icon: Warehouse },
                        {
                            label: 'Bajo alerta',
                            value: stats.bajo_minimo,
                            variant: 'warning',
                            icon: TriangleAlert,
                        },
                        { label: 'Filtros', value: filters.search ? 1 : 0, variant: 'warning', icon: Filter },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                />

                {sinSedes ? (
                    <EmptyState
                        icon={Warehouse}
                        title="No hay sedes activas"
                        description="Crea una sede en Configuración para registrar existencias."
                    />
                ) : (
                    <DataTable
                        columns={columns}
                        data={paginated.data}
                        rowKey={(row) => row.id}
                        sort={sort}
                        onSortChange={setSort}
                        isLoading={isLoading}
                        ariaLiveMessage={`${stats.coincidencias} repuestos en stock`}
                        toolbar={
                            <DataToolbar
                                search={search}
                                onSearchChange={setSearch}
                                isSearching={isLoading}
                                placeholder="Buscar repuesto o SKU…"
                            >
                                <Select
                                    value={filters.sede_id}
                                    onValueChange={(value) => applyFilter({ sede_id: value })}
                                >
                                    <SelectTrigger className="h-9 w-56" aria-label="Sede">
                                        <SelectValue placeholder="Sede" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sedes.map((sede) => (
                                            <SelectItem key={sede.id} value={sede.id}>
                                                {sede.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    sede_id: filters.sede_id || undefined,
                                }}
                            />
                        }
                        emptyState={
                            <EmptyState
                                icon={Warehouse}
                                title="Sin repuestos"
                                description="Crea un repuesto para ver y ajustar su stock en esta sede."
                            />
                        }
                    />
                )}
            </div>

            <Can permission="stock.adjust">
                <StockAdjustDialog
                    open={adjusting !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeAdjust();
                        }
                    }}
                    producto={adjusting}
                    sedeId={filters.sede_id}
                    sedeNombre={sedeActual?.nombre ?? ''}
                />
            </Can>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Inventario' }, { title: 'Stock', href: '/inventario/stock' }],
};
