import { Head } from '@inertiajs/react';
import { Filter, Plus, ScreenShare, Wrench } from 'lucide-react';
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
import servicios from '@/routes/taller/servicios';
import type { Paginated } from '@/types';
import { ServicioDeleteDialog } from './components/servicio-delete-dialog';
import { ServicioFormModal } from './components/servicio-form-modal';
import { ServicioKitModal } from './components/servicio-kit-modal';
import { ServicioRowActions } from './components/servicio-row-actions';
import type { CategoriaOption, ProductoOption, Servicio, ServicioFilters, ServicioStats } from './types';

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; servicio: Servicio }
    | { type: 'kit'; servicio: Servicio }
    | { type: 'delete'; servicio: Servicio };

const ALL_CATEGORIAS = '__todas__';

const money = (value: string | number | null): string => {
    if (value === null || value === '') {
        return '—';
    }

    return Number(value).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
};

export default function Index({
    servicios: paginated,
    filters,
    stats,
    categoria_options: categorias,
    producto_options: productos = [],
}: {
    servicios: Paginated<Servicio>;
    filters: ServicioFilters;
    stats: ServicioStats;
    categoria_options: readonly CategoriaOption[];
    producto_options?: readonly ProductoOption[];
}) {
    const { can } = usePermission();
    const canCreate = can('servicios.create');
    const canUpdate = can('servicios.update');
    const canDelete = can('servicios.delete');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: ServicioFilters['estado'];
            categoria_id: string;
        }>({
            routeUrl: servicios.index().url,
            initialFilters: filters,
            only: ['servicios', 'filters', 'stats', 'producto_options'],
            errorMessage: 'No se pudo cargar los servicios.',
            storageKey: 'tallersaas.servicios.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openEdit = useCallback(
        (servicio: Servicio) => setModal({ type: 'edit', servicio }),
        [],
    );
    const openKit = useCallback(
        (servicio: Servicio) => setModal({ type: 'kit', servicio }),
        [],
    );
    const openDelete = useCallback(
        (servicio: Servicio) => setModal({ type: 'delete', servicio }),
        [],
    );

    const showRowActions = canUpdate || canDelete;

    const columns = useMemo<DataTableColumn<Servicio>[]>(() => {
        const base: DataTableColumn<Servicio>[] = [
            {
                key: 'nombre',
                header: 'Servicio',
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
                key: 'precio',
                header: 'Precio',
                sortable: true,
                cell: (row) => <span className="tabular-nums text-sm">{money(row.precio)}</span>,
            },
            {
                key: 'kit',
                header: 'Kit',
                cell: (row) => {
                    const count = row.kit_items_count ?? row.kit_items?.length ?? 0;

                    if (count <= 0) {
                        return <span className="text-sm text-muted-foreground">—</span>;
                    }

                    return (
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-brand-200/70 dark:bg-brand-950/40 dark:text-brand-200 dark:ring-brand-800/50">
                            {count} {count === 1 ? 'repuesto' : 'repuestos'}
                        </span>
                    );
                },
            },
            {
                key: 'duracion_minutos',
                header: 'Duración',
                sortable: true,
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.duracion_minutos != null ? `${row.duracion_minutos} min` : '—'}
                    </span>
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

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (row) => (
                    <div className="flex justify-end">
                        <ServicioRowActions
                            servicio={row}
                            onEdit={openEdit}
                            onKit={openKit}
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
    }, [showRowActions, canUpdate, canDelete, openEdit, openKit, openDelete]);

    const estadoOptions: FilterChip<ServicioFilters['estado']>[] = [
        { value: 'todas', label: 'Todos' },
        { value: 'activa', label: 'Activos' },
        { value: 'inactiva', label: 'Inactivos' },
    ];

    const categoriaOptions = useMemo<FilterChip<string>[]>(
        () => [
            { value: ALL_CATEGORIAS, label: 'Todas las categorías' },
            ...categorias.map((cat) => ({
                value: cat.id,
                label: cat.nombre,
            })),
        ],
        [categorias],
    );

    const activeFiltersCount =
        (filters.estado !== 'todas' ? 1 : 0) + (filters.categoria_id ? 1 : 0);

    return (
        <>
            <Head title="Servicios" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Servicios"
                    description="Mano de obra con precio para armar la orden de trabajo."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Wrench },
                        { label: 'Activos', value: stats.activos, variant: 'primary', icon: Wrench },
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
                        <Can permission="servicios.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" />
                                Nuevo servicio
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
                    ariaLiveMessage={`${stats.coincidencias} servicios encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar servicio…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as ServicioFilters['estado'] })
                                }
                                options={estadoOptions}
                            />
                            {categorias.length > 0 && (
                                <FilterChips
                                    ariaLabel="Filtrar por categoría"
                                    value={filters.categoria_id || ALL_CATEGORIAS}
                                    onChange={(value) =>
                                        applyFilter({
                                            categoria_id:
                                                value === ALL_CATEGORIAS ? '' : value,
                                        })
                                    }
                                    options={categoriaOptions}
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
                                estado: filters.estado !== 'todas' ? filters.estado : undefined,
                                categoria_id: filters.categoria_id || undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Wrench}
                            title="Aún no hay servicios"
                            description="Crea el primero para cargarlo en las órdenes de trabajo."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setModal({ type: 'create' })}
                                    >
                                        <Plus className="size-4" />
                                        Crear servicio
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <ServicioFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                servicio={modal.type === 'edit' ? modal.servicio : null}
                categorias={categorias}
            />

            <ServicioKitModal
                open={modal.type === 'kit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                servicio={modal.type === 'kit' ? modal.servicio : null}
                productos={productos}
            />

            <ServicioDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                servicio={modal.type === 'delete' ? modal.servicio : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Taller' }, { title: 'Servicios', href: '/taller/servicios' }],
};
