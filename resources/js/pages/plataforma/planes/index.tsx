import { Head } from '@inertiajs/react';
import { Filter, Layers, Plus, ScreenShare, SlidersHorizontal } from 'lucide-react';
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
import planes from '@/routes/plataforma/planes';
import type { Paginated } from '@/types';
import { PlanFeaturesModal } from './components/plan-features-modal';
import { PlanFormModal } from './components/plan-form-modal';
import type {
    FeatureCatalogItem,
    Plan,
    PlanFilters,
    PlanStats,
} from './types';

type IndexProps = {
    plans: Paginated<Plan>;
    filters: PlanFilters;
    stats: PlanStats;
    feature_catalog: readonly FeatureCatalogItem[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; plan: Plan }
    | { type: 'features'; plan: Plan };

const money = (value: string | number): string =>
    Number(value).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export default function Index({
    plans: paginated,
    filters,
    stats,
    feature_catalog: catalog,
}: IndexProps) {
    const { can } = usePermission();
    const canCreate = can('plataforma-planes.create');
    const canUpdate = can('plataforma-planes.update');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: PlanFilters['estado'] }>({
            routeUrl: planes.index().url,
            initialFilters: filters,
            only: ['plans', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar los planes.',
            storageKey: 'tallersaas.plataforma-planes.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const columns = useMemo<DataTableColumn<Plan>[]>(
        () => [
            {
                key: 'nombre',
                header: 'Plan',
                sortable: true,
                cell: (plan) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{plan.nombre}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {plan.codigo}
                        </span>
                    </div>
                ),
            },
            {
                key: 'precio_mensual',
                header: 'Mensual',
                sortable: true,
                cell: (plan) => (
                    <span className="tabular-nums">{money(plan.precio_mensual)}</span>
                ),
            },
            {
                key: 'trial_days',
                header: 'Prueba',
                cell: (plan) => (
                    <span className="text-sm">{plan.trial_days} días</span>
                ),
            },
            {
                key: 'activo',
                header: 'Estado',
                cell: (plan) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            plan.activo
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-stone-100 text-stone-600'
                        }`}
                    >
                        {plan.activo ? 'Activo' : 'Inactivo'}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (plan) =>
                    canUpdate ? (
                        <div className="flex justify-end gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => setModal({ type: 'features', plan })}
                            >
                                <SlidersHorizontal className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => setModal({ type: 'edit', plan })}
                            >
                                Editar
                            </Button>
                        </div>
                    ) : null,
            },
        ],
        [canUpdate],
    );

    const estadoOptions: FilterChip[] = [
        { value: 'todos', label: 'Todos' },
        { value: 'activos', label: 'Activos' },
        { value: 'inactivos', label: 'Inactivos' },
        { value: 'publicos', label: 'Públicos' },
    ];

    return (
        <>
            <Head title="Planes" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Planes"
                    description="Catálogo comercial y límites que se asignan a cada taller."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Layers },
                        { label: 'Activos', value: stats.activos, variant: 'primary', icon: Layers },
                        { label: 'Filtros', value: filters.estado !== 'todos' ? 1 : 0, variant: 'warning', icon: Filter },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        <Can permission="plataforma-planes.create">
                            <Button
                                type="button"
                                onClick={() => setModal({ type: 'create' })}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" />
                                Nuevo plan
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(plan) => plan.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.coincidencias} planes encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar plan…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar planes"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as PlanFilters['estado'] })
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
                                    filters.estado !== 'todos' ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Layers}
                            title="No hay planes"
                            description="Crea el primer plan comercial."
                        />
                    }
                />
            </div>

            <PlanFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                plan={modal.type === 'edit' ? modal.plan : null}
            />

            <PlanFeaturesModal
                open={modal.type === 'features'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                plan={modal.type === 'features' ? modal.plan : null}
                catalog={catalog}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Plataforma' },
        { title: 'Planes', href: '/plataforma/planes' },
    ],
};
