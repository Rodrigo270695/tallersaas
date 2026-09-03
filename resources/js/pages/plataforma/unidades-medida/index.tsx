import { Head } from '@inertiajs/react';
import { Filter, Plus, Ruler, ScreenShare } from 'lucide-react';
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
import unidadesMedida from '@/routes/plataforma/unidades-medida';
import type { Paginated } from '@/types';
import { UnidadMedidaDeleteDialog } from './components/unidad-medida-delete-dialog';
import { UnidadMedidaFormModal } from './components/unidad-medida-form-modal';
import { UnidadMedidaRowActions } from './components/unidad-medida-row-actions';
import type { UnidadMedida, UnidadMedidaFilters, UnidadMedidaStats } from './types';

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; unidad: UnidadMedida }
    | { type: 'delete'; unidad: UnidadMedida };

export default function Index({
    unidades: paginated,
    filters,
    stats,
}: {
    unidades: Paginated<UnidadMedida>;
    filters: UnidadMedidaFilters;
    stats: UnidadMedidaStats;
}) {
    const { can } = usePermission();
    const canCreate = can('plataforma-unidades-medida.create');
    const canUpdate = can('plataforma-unidades-medida.update');
    const canDelete = can('plataforma-unidades-medida.delete');
    const showRowActions = canUpdate || canDelete;

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: UnidadMedidaFilters['estado'] }>({
            routeUrl: unidadesMedida.index().url,
            initialFilters: filters,
            only: ['unidades', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar las unidades de medida.',
            storageKey: 'tallersaas.plataforma-unidades-medida.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openEdit = useCallback(
        (unidad: UnidadMedida) => setModal({ type: 'edit', unidad }),
        [],
    );
    const openDelete = useCallback(
        (unidad: UnidadMedida) => setModal({ type: 'delete', unidad }),
        [],
    );

    const columns = useMemo<DataTableColumn<UnidadMedida>[]>(() => {
        const base: DataTableColumn<UnidadMedida>[] = [
            {
                key: 'codigo',
                header: 'Código',
                sortable: true,
                cell: (row) => (
                    <span className="font-mono text-sm font-semibold">{row.codigo}</span>
                ),
            },
            {
                key: 'nombre',
                header: 'Nombre',
                sortable: true,
                cell: (row) => <span className="font-medium">{row.nombre}</span>,
            },
            {
                key: 'orden',
                header: 'Orden',
                sortable: true,
                cell: (row) => (
                    <span className="tabular-nums text-sm text-muted-foreground">{row.orden}</span>
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

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (row) => (
                    <div className="flex justify-end">
                        <UnidadMedidaRowActions
                            unidad={row}
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

    const estadoOptions: FilterChip<UnidadMedidaFilters['estado']>[] = [
        { value: 'todas', label: 'Todas' },
        { value: 'activa', label: 'Activas' },
        { value: 'inactiva', label: 'Inactivas' },
    ];

    return (
        <>
            <Head title="Unidades de medida" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Unidades de medida"
                    description="Catálogo global para todos los talleres (UN, L, KG…)."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Ruler },
                        {
                            label: 'Activas',
                            value: stats.activas,
                            variant: 'primary',
                            icon: Ruler,
                        },
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
                        <Can permission="plataforma-unidades-medida.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" />
                                Nueva unidad
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
                    ariaLiveMessage={`${stats.coincidencias} unidades encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por código o nombre…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar unidades"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({
                                        estado: estado as UnidadMedidaFilters['estado'],
                                    })
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
                            icon={Ruler}
                            title="Aún no hay unidades"
                            description="Crea la primera para que los talleres la usen en repuestos."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setModal({ type: 'create' })}
                                    >
                                        <Plus className="size-4" />
                                        Crear unidad
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <UnidadMedidaFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                unidad={modal.type === 'edit' ? modal.unidad : null}
            />

            <UnidadMedidaDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                unidad={modal.type === 'delete' ? modal.unidad : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Plataforma' },
        { title: 'Unidades de medida', href: '/plataforma/unidades-medida' },
    ],
};
