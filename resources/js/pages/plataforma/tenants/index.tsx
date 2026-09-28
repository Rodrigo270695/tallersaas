import { Head } from '@inertiajs/react';
import {
    Building2,
    PauseCircle,
    Plus,
    ScreenShare,
} from 'lucide-react';
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
import type { GeoOption } from '@/components/geo/geo-cascade-fields';
import { planColor } from '@/components/tenant-plan-badge';
import { tenantHost, useTenancy } from '@/lib/tenancy-url';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import tenants from '@/routes/plataforma/tenants';
import type { Paginated } from '@/types';
import { TenantFormModal } from './components/tenant-form-modal';
import { TenantRowActions } from './components/tenant-row-actions';
import { TenantSuspendDialog } from './components/tenant-suspend-dialog';
import type {
    PlanCatalogItem,
    PlataformaTenant,
    TenantEstado,
    TenantFilters,
    TenantStats,
} from './types';

type IndexProps = {
    tenants: Paginated<PlataformaTenant>;
    filters: TenantFilters;
    stats: TenantStats;
    plans_catalog: readonly PlanCatalogItem[];
    departamentos: readonly GeoOption[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; tenant: PlataformaTenant }
    | { type: 'suspend'; tenant: PlataformaTenant };

const DEFAULT_PER_PAGE = 10;

const ESTADO_LABEL: Record<TenantEstado, string> = {
    trial: 'Prueba',
    active: 'Activo',
    grace: 'Gracia',
    suspended: 'Suspendido',
    cancelled: 'Cancelado',
};

const estadoClass: Record<TenantEstado, string> = {
    trial: 'bg-sky-100 text-sky-900 ring-1 ring-sky-300/80',
    active: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80',
    grace: 'bg-amber-100 text-amber-950 ring-1 ring-amber-300/80',
    suspended: 'bg-rose-100 text-rose-900 ring-1 ring-rose-300/80',
    cancelled: 'bg-stone-100 text-stone-700 ring-1 ring-stone-300/80',
};

export default function Index({
    tenants: paginated,
    filters,
    stats,
    plans_catalog: plans,
    departamentos = [],
}: IndexProps) {
    const tenancy = useTenancy();
    const { can } = usePermission();
    const canCreate = can('plataforma-tenants.create');
    const canUpdate = can('plataforma-tenants.update');
    const canSuspend = can('plataforma-tenants.suspend');
    const canResume = can('plataforma-tenants.resume');
    const canImpersonate = can('plataforma-tenants.impersonate');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: TenantFilters['estado'] }>({
            routeUrl: tenants.index().url,
            initialFilters: filters,
            only: ['tenants', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar los talleres.',
            storageKey: 'tallersaas.plataforma-tenants.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const columns = useMemo<DataTableColumn<PlataformaTenant>[]>(() => {
        const base: DataTableColumn<PlataformaTenant>[] = [
            {
                key: 'razon_social',
                header: 'Taller',
                sortable: true,
                cell: (tenant) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{tenant.razon_social}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {tenantHost(tenant.slug, tenancy)}
                        </span>
                    </div>
                ),
            },
            {
                key: 'email_admin',
                header: 'Contacto',
                cell: (tenant) => (
                    <div className="flex flex-col text-xs leading-tight">
                        <span className="truncate">{tenant.email_admin}</span>
                        <span className="truncate font-mono text-muted-foreground">
                            {tenant.telefono || 'Sin teléfono'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'plan',
                header: 'Plan',
                cell: (tenant) => {
                    const plan = tenant.subscriptions?.[0]?.plan;

                    if (!plan) {
                        return <span className="text-xs text-muted-foreground">Sin plan</span>;
                    }

                    const hex = planColor(plan.codigo, plan.color_hex);

                    return (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: hex }} />
                            <span className="text-sm font-medium">{plan.nombre}</span>
                            {plan.badge ? (
                                <span
                                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{ color: hex, backgroundColor: `${hex}1A` }}
                                >
                                    {plan.badge}
                                </span>
                            ) : null}
                        </span>
                    );
                },
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (tenant) => (
                    <span
                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoClass[tenant.estado]}`}
                    >
                        {ESTADO_LABEL[tenant.estado]}
                    </span>
                ),
            },
            {
                key: 'ubicacion',
                header: 'Ubicación',
                cell: (tenant) => {
                    const sede = tenant.sedes?.[0];
                    const place = [sede?.distrito, sede?.provincia, sede?.departamento].filter(Boolean).join(', ');

                    return place ? (
                        <span className="text-xs">{place}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">Sin sede</span>
                    );
                },
            },
            {
                key: 'vencimiento',
                header: 'Vencimiento',
                cell: (tenant) => <ExpiryBadge tenant={tenant} />,
            },
            {
                key: 'created_at',
                header: 'Creado',
                sortable: true,
                cell: (tenant) => (
                    <span className="text-xs text-muted-foreground">
                        {new Date(tenant.created_at).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </span>
                ),
            },
        ];

        base.push({
            key: 'acciones',
            header: <span className="md:sr-only">Acciones</span>,
            align: 'right',
            className: 'w-12',
            cell: (tenant) => (
                <div className="flex justify-end">
                    <TenantRowActions
                        tenant={tenant}
                        onEdit={(item) => setModal({ type: 'edit', tenant: item })}
                        onSuspend={(item) => setModal({ type: 'suspend', tenant: item })}
                        canUpdate={canUpdate}
                        canSuspend={canSuspend}
                        canResume={canResume}
                        canImpersonate={canImpersonate}
                    />
                </div>
            ),
        });

        return base;
    }, [canUpdate, canSuspend, canResume, canImpersonate, tenancy]);

    const estadoOptions: FilterChip[] = [
        { value: 'todos', label: 'Todos' },
        { value: 'trial', label: 'Prueba' },
        { value: 'active', label: 'Activos' },
        { value: 'suspended', label: 'Suspendidos' },
        { value: 'cancelled', label: 'Cancelados' },
    ];

    return (
        <>
            <Head title="Talleres" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Talleres"
                    description="Provisiona, suspende y entra a los talleres desde el panel central."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Building2 },
                        { label: 'Activos', value: stats.active, variant: 'primary', icon: Building2 },
                        { label: 'Suspendidos', value: stats.suspended, variant: 'warning', icon: PauseCircle },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        <Can permission="plataforma-tenants.create">
                            <Button
                                type="button"
                                onClick={() => setModal({ type: 'create' })}
                                className="cursor-pointer gap-2"
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                Nuevo taller
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(tenant) => tenant.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.coincidencias} talleres encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por razón social, slug o correo…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({
                                        estado: estado as TenantFilters['estado'],
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
                                estado:
                                    filters.estado !== 'todos' ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Building2}
                            title="Aún no hay talleres"
                            description="Crea el primer taller para provisionar su subdominio."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        onClick={() => setModal({ type: 'create' })}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus className="size-4" />
                                        Crear taller
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <TenantFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                tenant={modal.type === 'edit' ? modal.tenant : null}
                plans={plans}
                departamentos={departamentos}
            />

            <TenantSuspendDialog
                open={modal.type === 'suspend'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                tenant={modal.type === 'suspend' ? modal.tenant : null}
            />
        </>
    );
}

function ExpiryBadge({ tenant }: { tenant: PlataformaTenant }) {
    if (tenant.slug === 'demo') {
        return (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                No vence
            </span>
        );
    }

    const sub = tenant.subscriptions?.[0];
    const iso = sub?.proximo_cobro_at ?? sub?.current_period_end ?? tenant.trial_ends_at;

    if (!iso) {
        return <span className="text-xs text-muted-foreground">Sin fecha</span>;
    }

    const target = new Date(iso);
    const days = Math.round((target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
    const tone =
        days < 0
            ? 'bg-rose-100 text-rose-800'
            : days <= 7
              ? 'bg-amber-100 text-amber-900'
              : 'bg-emerald-100 text-emerald-800';
    const label = days < 0 ? `Vencido (${Math.abs(days)} días)` : days === 0 ? 'Vence hoy' : `Al día (${days} días)`;

    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>;
}

Index.layout = {
    breadcrumbs: [
        { title: 'Plataforma' },
        { title: 'Talleres', href: '/plataforma/tenants' },
    ],
};
