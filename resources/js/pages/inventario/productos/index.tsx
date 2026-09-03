import { Head } from '@inertiajs/react';
import { Filter, Package, Plus, ScreenShare } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import productos from '@/routes/inventario/productos';
import type { Paginated } from '@/types';
import { ProductoDeleteDialog } from './components/producto-delete-dialog';
import { ProductoFormModal } from './components/producto-form-modal';
import { ProductoFotoCell } from './components/producto-foto-cell';
import type {
    Producto,
    ProductoFilters,
    ProductoOption,
    ProductoStats,
    SedeOption,
    UnidadOption,
} from './types';

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; producto: Producto }
    | { type: 'delete'; producto: Producto };

const ALL_CATEGORIAS = '__todas__';

const money = (value: string | number | null): string => {
    if (value === null || value === '') {
        return '—';
    }

    return Number(value).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
};

export default function Index({
    productos: paginated,
    filters,
    stats,
    categoria_options: categorias,
    unidad_options: unidades,
    sede_options: sedes,
}: {
    productos: Paginated<Producto>;
    filters: ProductoFilters;
    stats: ProductoStats;
    categoria_options: readonly ProductoOption[];
    unidad_options: readonly UnidadOption[];
    sede_options: readonly SedeOption[];
}) {
    const { can } = usePermission();
    const canCreate = can('productos.create');
    const canUpdate = can('productos.update');
    const canDelete = can('productos.delete');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: ProductoFilters['estado'];
            categoria_id: string;
        }>({
            routeUrl: productos.index().url,
            initialFilters: filters,
            only: ['productos', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar los repuestos.',
            storageKey: 'tallersaas.inventario-productos.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const columns = useMemo<DataTableColumn<Producto>[]>(() => {
        const base: DataTableColumn<Producto>[] = [
            {
                key: 'foto',
                header: 'Foto',
                cell: (row) => (
                    <ProductoFotoCell
                        fotoUrl={row.foto_url}
                        etiqueta={row.nombre}
                    />
                ),
                className: 'w-14',
            },
            {
                key: 'nombre',
                header: 'Repuesto',
                sortable: true,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                            {row.categoria?.nombre ?? 'Sin categoría'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'sku',
                header: 'SKU',
                sortable: true,
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">{row.sku ?? '—'}</span>
                ),
            },
            {
                key: 'unidad',
                header: 'Unidad',
                sortable: true,
                cell: (row) => <span className="text-sm">{row.unidad}</span>,
            },
            {
                key: 'precio_venta',
                header: 'P. venta',
                sortable: true,
                cell: (row) => (
                    <span className="tabular-nums text-sm">{money(row.precio_venta)}</span>
                ),
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

        if (canUpdate || canDelete) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (row) => (
                    <div className="flex justify-end gap-1">
                        {canUpdate && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => setModal({ type: 'edit', producto: row })}
                            >
                                Editar
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer text-destructive"
                                onClick={() => setModal({ type: 'delete', producto: row })}
                            >
                                Eliminar
                            </Button>
                        )}
                    </div>
                ),
            });
        }

        return base;
    }, [canUpdate, canDelete]);

    const estadoOptions: FilterChip[] = [
        { value: 'todas', label: 'Todos' },
        { value: 'activa', label: 'Activos' },
        { value: 'inactiva', label: 'Inactivos' },
    ];

    const activeFiltersCount =
        (filters.estado !== 'todas' ? 1 : 0) + (filters.categoria_id ? 1 : 0);

    return (
        <>
            <Head title="Repuestos" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Repuestos"
                    description="Catálogo de productos y repuestos del taller."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Package },
                        { label: 'Activos', value: stats.activos, variant: 'primary', icon: Package },
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
                        <Can permission="productos.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" />
                                Nuevo repuesto
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
                    ariaLiveMessage={`${stats.coincidencias} repuestos encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por nombre, SKU o código…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as ProductoFilters['estado'] })
                                }
                                options={estadoOptions}
                            />
                            {categorias.length > 0 && (
                                <Select
                                    value={filters.categoria_id || ALL_CATEGORIAS}
                                    onValueChange={(value) =>
                                        applyFilter({
                                            categoria_id: value === ALL_CATEGORIAS ? '' : value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-9 w-44" aria-label="Categoría">
                                        <SelectValue placeholder="Categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL_CATEGORIAS}>Todas las categorías</SelectItem>
                                        {categorias.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                estado: filters.estado !== 'todas' ? filters.estado : undefined,
                                categoria_id: filters.categoria_id || undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Package}
                            title="Aún no hay repuestos"
                            description="Crea el primero para venderlo o descontarlo del almacén."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setModal({ type: 'create' })}
                                    >
                                        <Plus className="size-4" />
                                        Crear repuesto
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <ProductoFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                producto={modal.type === 'edit' ? modal.producto : null}
                categorias={categorias}
                unidades={unidades}
                sedes={sedes}
            />

            <ProductoDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                producto={modal.type === 'delete' ? modal.producto : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Inventario' },
        { title: 'Repuestos', href: '/inventario/productos' },
    ],
};
