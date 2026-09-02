import { Head, router } from '@inertiajs/react';
import { ClipboardList, Filter, Plus, ScreenShare } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import presupuestos from '@/routes/taller/presupuestos';
import type { Paginated } from '@/types';
import { PresupuestoDeleteDialog } from './components/presupuesto-delete-dialog';
import { PresupuestoEnviarModal } from './components/presupuesto-enviar-modal';
import { PresupuestoFormModal } from './components/presupuesto-form-modal';
import { PresupuestoRowActions } from './components/presupuesto-row-actions';
import type {
    ClienteOption,
    OrdenOption,
    Presupuesto,
    PresupuestoEstado,
    PresupuestoEstadoFilter,
    PresupuestoFilters,
    PresupuestoStats,
    ProductoCobroOption,
    SedeOption,
    ServicioCobroOption,
    VehiculoOption,
} from './types';

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; presupuesto: Presupuesto }
    | { type: 'delete'; presupuesto: Presupuesto }
    | { type: 'enviar'; presupuesto: Presupuesto };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO: PresupuestoEstadoFilter = 'todas';

const ESTADO_LABEL: Record<PresupuestoEstado, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    vencido: 'Vencido',
    convertido: 'Aplicado',
};

const estadoClass: Record<PresupuestoEstado, string> = {
    borrador: 'bg-stone-100 text-stone-700',
    enviado: 'bg-sky-50 text-sky-800',
    aprobado: 'bg-emerald-50 text-emerald-800',
    rechazado: 'bg-rose-50 text-rose-800',
    vencido: 'bg-amber-50 text-amber-800',
    convertido: 'bg-violet-50 text-violet-800',
};

const money = (value: string | number): string =>
    Number(value ?? 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export default function Index({
    presupuestos: paginated,
    filters,
    stats,
    sedes,
    clientes,
    vehiculos,
    ordenes,
    taller_nombre: tallerNombre = 'el taller',
    productos = [],
    servicios = [],
}: {
    presupuestos: Paginated<Presupuesto>;
    filters: PresupuestoFilters;
    stats: PresupuestoStats;
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    ordenes: readonly OrdenOption[];
    taller_nombre?: string;
    productos: readonly ProductoCobroOption[];
    servicios: readonly ServicioCobroOption[];
}) {
    const { can } = usePermission();
    const canCreate = can('cotizaciones.create');
    const canUpdate = can('cotizaciones.update');
    const canDelete = can('cotizaciones.delete');
    const canEnviar = can('cotizaciones.create');
    const canAprobar = can('cotizaciones.aprobar');
    const showRowActions = canUpdate || canDelete || canEnviar || canAprobar;

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: PresupuestoEstadoFilter }>({
            routeUrl: presupuestos.index().url,
            initialFilters: filters,
            only: ['presupuestos', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar los presupuestos.',
            storageKey: 'tallersaas.presupuestos.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const activeFiltersCount = useMemo(() => {
        let count = 0;

        if (filters.search) {
            count += 1;
        }

        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }

        if (filters.sort) {
            count += 1;
        }

        return count;
    }, [filters.search, filters.estado, filters.sort]);

    const estadoOptions: readonly FilterChip<PresupuestoEstadoFilter>[] = useMemo(
        () => [
            { value: 'todas', label: 'Todos' },
            { value: 'borrador', label: 'Borrador' },
            { value: 'enviado', label: 'Enviados' },
            { value: 'aprobado', label: 'Aprobados' },
            { value: 'rechazado', label: 'Rechazados' },
            { value: 'vencido', label: 'Vencidos' },
            { value: 'convertido', label: 'Aplicados' },
        ],
        [],
    );

    const copiarLink = useCallback((presupuesto: Presupuesto) => {
        const url = `${window.location.origin}/p/${presupuesto.public_token}`;
        void navigator.clipboard.writeText(url).then(() => {
            toast.success('Enlace copiado al portapapeles.');
        });
    }, []);

    const columns = useMemo<DataTableColumn<Presupuesto>[]>(() => {
        const base: DataTableColumn<Presupuesto>[] = [
            {
                key: 'numero',
                header: 'Presupuesto',
                sortable: true,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-mono text-sm font-medium">{row.numero}</span>
                        <span className="text-xs text-muted-foreground">
                            {row.orden_trabajo?.numero ? `OT ${row.orden_trabajo.numero}` : 'Sin OT'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'cliente',
                header: 'Cliente / vehículo',
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="text-sm">
                            {row.cliente
                                ? `${row.cliente.nombres} ${row.cliente.apellidos ?? ''}`
                                : '—'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {row.vehiculo?.placa ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (row) => (
                    <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estadoClass[row.estado]}`}
                    >
                        {ESTADO_LABEL[row.estado]}
                    </span>
                ),
            },
            {
                key: 'total',
                header: 'Total',
                sortable: true,
                cell: (row) => (
                    <span className="tabular-nums text-sm font-medium">{money(row.total)}</span>
                ),
            },
            {
                key: 'valido_hasta',
                header: 'Válido hasta',
                sortable: true,
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.valido_hasta
                            ? new Date(row.valido_hasta).toLocaleDateString('es-PE')
                            : '—'}
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
                    <PresupuestoRowActions
                        presupuesto={row}
                        onEdit={(item) => setModal({ type: 'edit', presupuesto: item })}
                        onDelete={(item) => setModal({ type: 'delete', presupuesto: item })}
                        onEnviar={(item) => setModal({ type: 'enviar', presupuesto: item })}
                        onCopiarLink={copiarLink}
                        onAprobar={(item) =>
                            router.post(presupuestos.aprobar(item.id).url, {}, { preserveScroll: true })
                        }
                        onRechazar={(item) =>
                            router.post(
                                presupuestos.rechazar(item.id).url,
                                { motivo: 'Rechazado desde el taller' },
                                { preserveScroll: true },
                            )
                        }
                        onAplicar={(item) =>
                            router.post(presupuestos.aplicar(item.id).url, {}, { preserveScroll: true })
                        }
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        canEnviar={canEnviar}
                        canAprobar={canAprobar}
                    />
                ),
                className: 'w-12',
            });
        }

        return base;
    }, [showRowActions, canUpdate, canDelete, canEnviar, canAprobar, copiarLink]);

    return (
        <>
            <Head title="Presupuestos" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Presupuestos"
                    description="Cotiza trabajos y repuestos. El cliente aprueba desde un enlace por WhatsApp."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: ClipboardList },
                        { label: 'Pendientes', value: stats.pendientes, variant: 'warning', icon: Filter },
                        { label: 'Aprobados', value: stats.aprobados, variant: 'success', icon: ClipboardList },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        <Can permission="cotizaciones.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                Nuevo presupuesto
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
                    ariaLiveMessage={`${stats.coincidencias} presupuestos encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por número, cliente o placa…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
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
                                    filters.estado !== DEFAULT_ESTADO
                                        ? filters.estado
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ScreenShare}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Sin presupuestos'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba ajustando la búsqueda o los filtros.'
                                    : 'Crea el primer presupuesto para enviarlo al cliente.'
                            }
                            action={
                                activeFiltersCount === 0 && canCreate ? (
                                    <Button
                                        type="button"
                                        onClick={() => setModal({ type: 'create' })}
                                        className="cursor-pointer"
                                    >
                                        Nuevo presupuesto
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <PresupuestoFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => !open && closeModal()}
                presupuesto={modal.type === 'edit' ? modal.presupuesto : null}
                sedes={sedes}
                clientes={clientes}
                vehiculos={vehiculos}
                ordenes={ordenes}
                servicios={servicios}
                productos={productos}
            />

            <PresupuestoEnviarModal
                open={modal.type === 'enviar'}
                onOpenChange={(open) => !open && closeModal()}
                presupuesto={modal.type === 'enviar' ? modal.presupuesto : null}
                tallerNombre={tallerNombre}
            />

            <PresupuestoDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => !open && closeModal()}
                presupuesto={modal.type === 'delete' ? modal.presupuesto : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Taller' },
        { title: 'Presupuestos', href: '/taller/presupuestos' },
    ],
};
