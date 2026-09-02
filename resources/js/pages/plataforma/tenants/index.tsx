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
    trial: 'bg-sky-50 text-sky-800',
    active: 'bg-emerald-50 text-emerald-800',
    grace: 'bg-amber-50 text-amber-800',
    suspended: 'bg-rose-50 text-rose-800',
    cancelled: 'bg-stone-100 text-stone-600',
};

export default function Index({
    tenants: paginated,
    filters,
    stats,
    plans_catalog: plans,
}: IndexProps) {
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
                            {tenant.slug}
                        </span>
                    </div>
                ),
            },
            {
                key: 'email_admin',
                header: 'Admin',
                cell: (tenant) => (
                    <span className="text-sm">{tenant.email_admin}</span>
                ),
            },
            {
                key: 'plan',
                header: 'Plan',
                cell: (tenant) =>
                    tenant.subscriptions?.[0]?.plan?.nombre ?? (
                        <span className="text-xs text-muted-foreground">Sin plan</span>
                    ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (tenant) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estadoClass[tenant.estado]}`}
                    >
                        {ESTADO_LABEL[tenant.estado]}
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
    }, [canUpdate, canSuspend, canResume, canImpersonate]);

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
                            description="Crea el primer tenant para provisionar un schema."
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

Index.layout = {
    breadcrumbs: [
        { title: 'Plataforma' },
        { title: 'Talleres', href: '/plataforma/tenants' },
    ],
};
