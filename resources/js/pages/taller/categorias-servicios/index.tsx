import { Head } from '@inertiajs/react';
import { Filter, Plus, ScreenShare, Tags } from 'lucide-react';
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
import categorias from '@/routes/taller/categorias-servicios';
import type { Paginated } from '@/types';
import { CategoriaDeleteDialog } from './components/categoria-delete-dialog';
import { CategoriaFormModal } from './components/categoria-form-modal';
import type { CategoriaFilters, CategoriaServicio, CategoriaStats } from './types';

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; categoria: CategoriaServicio }
    | { type: 'delete'; categoria: CategoriaServicio };

export default function Index({
    categorias: paginated,
    filters,
    stats,
}: {
    categorias: Paginated<CategoriaServicio>;
    filters: CategoriaFilters;
    stats: CategoriaStats;
}) {
    const { can } = usePermission();
    const canCreate = can('categorias-servicios.create');
    const canUpdate = can('categorias-servicios.update');
    const canDelete = can('categorias-servicios.delete');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: CategoriaFilters['estado'] }>({
            routeUrl: categorias.index().url,
            initialFilters: filters,
            only: ['categorias', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar las categorías.',
            storageKey: 'tallersaas.categorias-servicios.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const columns = useMemo<DataTableColumn<CategoriaServicio>[]>(() => {
        const base: DataTableColumn<CategoriaServicio>[] = [
            {
                key: 'nombre',
                header: 'Categoría',
                sortable: true,
                cell: (row) => <span className="font-medium">{row.nombre}</span>,
            },
            {
                key: 'servicios_count',
                header: 'Servicios',
                cell: (row) => (
                    <span className="tabular-nums text-sm">{row.servicios_count ?? 0}</span>
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
                        {row.activo ? 'Activa' : 'Inactiva'}
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
                                onClick={() => setModal({ type: 'edit', categoria: row })}
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
                                onClick={() => setModal({ type: 'delete', categoria: row })}
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
        { value: 'todas', label: 'Todas' },
        { value: 'activa', label: 'Activas' },
        { value: 'inactiva', label: 'Inactivas' },
    ];

    return (
        <>
            <Head title="Categorías de servicios" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Categorías de servicios"
                    description="Agrupa la mano de obra (mantenimiento, frenos, diagnóstico…)."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Tags },
                        { label: 'Activas', value: stats.activas, variant: 'primary', icon: Tags },
                        {
                            label: 'Filtros',
                            value: filters.estado !== 'todas' ? 1 : 0,
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
                        <Can permission="categorias-servicios.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" />
                                Nueva categoría
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
                    ariaLiveMessage={`${stats.coincidencias} categorías encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar categoría…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar categorías"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as CategoriaFilters['estado'] })
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
                                estado: filters.estado !== 'todas' ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Tags}
                            title="Aún no hay categorías"
                            description="Crea la primera para organizar los servicios del taller."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setModal({ type: 'create' })}
                                    >
                                        <Plus className="size-4" />
                                        Crear categoría
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <CategoriaFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                categoria={modal.type === 'edit' ? modal.categoria : null}
            />

            <CategoriaDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                categoria={modal.type === 'delete' ? modal.categoria : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Taller' },
        { title: 'Categorías de servicios', href: '/taller/categorias-servicios' },
    ],
};
