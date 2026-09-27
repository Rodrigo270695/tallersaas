import { Head } from '@inertiajs/react';
import { CreditCard, Filter, ScreenShare } from 'lucide-react';
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
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import { statusPillClass, suscripcionEstadoBadgeClass } from '@/lib/status-badge';
import suscripciones from '@/routes/plataforma/suscripciones';
import type { Paginated } from '@/types';
import {
    SubscriptionFormModal,
    type SubscriptionPlanOption,
} from './components/subscription-form-modal';
import { SubscriptionRowActions } from './components/subscription-row-actions';

type Subscription = {
    id: string;
    tenant_id: string;
    plan_id: string;
    estado: string;
    ciclo: string;
    precio_pactado: string | number;
    descuento_pct: string | number;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    grace_ends_at: string | null;
    proximo_cobro_at: string | null;
    cancel_reason: string | null;
    cancel_feedback: string | null;
    tenant?: {
        id: string;
        slug: string;
        razon_social: string;
        nombre_comercial: string | null;
    } | null;
    plan?: { id: string; codigo: string; nombre: string } | null;
};

type Filters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    estado: string;
    plan_id: string;
};

type Stats = {
    total: number;
    trial: number;
    active: number;
    grace: number;
    coincidencias: number;
    mrr: string;
};

const ESTADO_LABEL: Record<string, string> = {
    trial: 'Prueba',
    active: 'Activa',
    grace: 'Gracia',
    suspended: 'Suspendida',
    cancelled: 'Cancelada',
};

const formatDay = (value: string | null): string => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
};

export default function Index({
    subscriptions: paginated,
    filters,
    stats,
    plans_catalog: plans = [],
}: {
    subscriptions: Paginated<Subscription>;
    filters: Filters;
    stats: Stats;
    plans_catalog: readonly SubscriptionPlanOption[];
}) {
    const { can } = usePermission();
    const canUpdate = can('plataforma-suscripciones.update');
    const [editing, setEditing] = useState<Subscription | null>(null);
    const closeEdit = useCallback(() => setEditing(null), []);
    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: string }>({
            routeUrl: suscripciones.index().url,
            initialFilters: filters,
            only: ['subscriptions', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar las suscripciones.',
            storageKey: 'tallersaas.plataforma-suscripciones.prefs',
            defaults: { per_page: 10, sort: null, direction: null },
        });

    const columns = useMemo<DataTableColumn<Subscription>[]>(
        () => [
            {
                key: 'tenant',
                header: 'Taller',
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">
                            {row.tenant?.razon_social ?? '—'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {row.tenant?.slug}
                        </span>
                    </div>
                ),
            },
            {
                key: 'plan',
                header: 'Plan',
                cell: (row) => row.plan?.nombre ?? '—',
            },
            {
                key: 'precio_pactado',
                header: 'Precio',
                sortable: true,
                cell: (row) => (
                    <span className="tabular-nums">
                        {Number(row.precio_pactado).toLocaleString('es-PE', {
                            style: 'currency',
                            currency: 'PEN',
                        })}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (row) => (
                    <span
                        className={`${statusPillClass} ${
                            suscripcionEstadoBadgeClass[
                                row.estado as keyof typeof suscripcionEstadoBadgeClass
                            ] ?? suscripcionEstadoBadgeClass.cancelled
                        }`}
                    >
                        {ESTADO_LABEL[row.estado] ?? row.estado}
                    </span>
                ),
            },
            {
                key: 'trial_ends_at',
                header: 'Prueba hasta',
                sortable: true,
                cell: (row) => formatDay(row.trial_ends_at),
            },
            {
                key: 'current_period_end',
                header: 'Periodo hasta',
                sortable: true,
                cell: (row) => formatDay(row.current_period_end),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (row) =>
                    canUpdate ? (
                        <div className="flex justify-end">
                            <SubscriptionRowActions
                                label={row.tenant?.razon_social ?? 'suscripción'}
                                onEdit={() => setEditing(row)}
                            />
                        </div>
                    ) : null,
            },
        ],
        [canUpdate],
    );

    const estadoOptions: FilterChip[] = [
        { value: 'todos', label: 'Todas' },
        { value: 'trial', label: 'Prueba' },
        { value: 'active', label: 'Activas' },
        { value: 'grace', label: 'Gracia' },
        { value: 'suspended', label: 'Suspendidas' },
        { value: 'cancelled', label: 'Canceladas' },
    ];

    return (
        <>
            <Head title="Suscripciones" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Suscripciones"
                    description="Contratos vigentes entre cada taller y su plan."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: CreditCard },
                        { label: 'Activas', value: stats.active, variant: 'primary', icon: CreditCard },
                        { label: 'Filtros', value: filters.estado !== 'todos' ? 1 : 0, variant: 'warning', icon: Filter },
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
                    rowKey={(row) => row.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.coincidencias} suscripciones encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por taller…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar suscripciones"
                                value={filters.estado}
                                onChange={(estado) => applyFilter({ estado })}
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
                            icon={CreditCard}
                            title="No hay suscripciones"
                            description="Aparecerán al crear un taller."
                        />
                    }
                />
            </div>

            <Can permission="plataforma-suscripciones.update">
                <SubscriptionFormModal
                    open={editing !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeEdit();
                        }
                    }}
                    subscription={editing}
                    plans={plans}
                />
            </Can>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Plataforma' },
        { title: 'Suscripciones', href: '/plataforma/suscripciones' },
    ],
};
