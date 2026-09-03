import { Head } from '@inertiajs/react';
import {
    ArrowDownLeft,
    Banknote,
    Filter,
    Lock,
    Plus,
    ScreenShare,
    Wallet,
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
import sesiones from '@/routes/caja/sesiones';
import type { Paginated } from '@/types';
import { AbrirCajaModal } from './components/abrir-caja-modal';
import { CerrarCajaModal } from './components/cerrar-caja-modal';
import { SesionEgresoModal } from './components/sesion-egreso-modal';
import type {
    CajaEstado,
    CajaFilters,
    CajaSesion,
    CajaStats,
    SedeOpcion,
} from './types';

type IndexProps = {
    sesiones: Paginated<CajaSesion>;
    sedes_opciones: readonly SedeOpcion[];
    mi_sesion_abierta: CajaSesion | null;
    filters: CajaFilters;
    stats: CajaStats;
    sin_sedes: boolean;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'abrir' }
    | { type: 'cerrar'; sesion: CajaSesion }
    | { type: 'egreso' };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO = 'todas';

const money = (value: string | number | null | undefined): string => {
    const n = Number(value ?? 0);

    return n.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
};

export default function Index({
    sesiones: paginated,
    sedes_opciones: sedes,
    mi_sesion_abierta: miSesion,
    filters,
    stats,
    sin_sedes: sinSedes,
}: IndexProps) {
    const { can } = usePermission();
    const canOpen = can('caja-sesiones.open');
    const canClose = can('caja-sesiones.close');
    const canEgreso = can('caja-sesiones.egreso');

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{ estado: CajaFilters['estado'] }>({
            routeUrl: sesiones.index().url,
            initialFilters: filters,
            only: ['sesiones', 'filters', 'stats', 'mi_sesion_abierta'],
            errorMessage: 'No se pudo cargar las sesiones de caja.',
            storageKey: 'tallersaas.caja-sesiones.prefs',
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

    const estadoOptions: FilterChip[] = [
        { value: 'todas', label: 'Todas' },
        { value: 'abierta', label: 'Abiertas' },
        { value: 'cerrada', label: 'Cerradas' },
    ];

    const columns = useMemo<DataTableColumn<CajaSesion>[]>(() => {
        const base: DataTableColumn<CajaSesion>[] = [
            {
                key: 'opened_at',
                header: 'Apertura',
                sortable: true,
                cell: (sesion) => (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">
                            {sesion.sede_nombre ?? '—'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(sesion.opened_at).toLocaleString('es-PE')}
                        </span>
                    </div>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (sesion) => (
                    <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            sesion.estado === 'abierta'
                                ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80'
                                : 'bg-stone-100 text-stone-700 ring-1 ring-stone-300/80'
                        }`}
                    >
                        {sesion.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                    </span>
                ),
            },
            {
                key: 'saldo_apertura',
                header: 'Apertura',
                sortable: true,
                cell: (sesion) => (
                    <span className="tabular-nums">{money(sesion.saldo_apertura)}</span>
                ),
            },
            {
                key: 'saldo_cierre_efectivo',
                header: 'Cierre',
                cell: (sesion) =>
                    sesion.saldo_cierre_efectivo !== null ? (
                        <span className="tabular-nums">
                            {money(sesion.saldo_cierre_efectivo)}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'abierta_por',
                header: 'Cajero',
                cell: (sesion) => (
                    <span className="text-sm">{sesion.abierta_por?.name ?? '—'}</span>
                ),
            },
        ];

        if (canClose) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                className: 'w-12',
                cell: (sesion) =>
                    sesion.estado === 'abierta' ? (
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer gap-1.5"
                                onClick={() => setModal({ type: 'cerrar', sesion })}
                            >
                                <Lock className="size-3.5" strokeWidth={2.25} />
                                Cerrar
                            </Button>
                        </div>
                    ) : null,
            });
        }

        return base;
    }, [canClose]);

    return (
        <>
            <Head title="Sesiones de caja" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Sesiones de caja"
                    description="Abre y cierra el turno de caja por sede antes de cobrar órdenes."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Wallet },
                        { label: 'Abiertas', value: stats.abiertas, variant: 'warning', icon: Banknote },
                        { label: 'Filtros', value: activeFiltersCount, variant: 'warning', icon: Filter },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        canOpen && !miSesion ? (
                            <Can permission="caja-sesiones.open">
                                <Button
                                    type="button"
                                    onClick={() => setModal({ type: 'abrir' })}
                                    disabled={sinSedes}
                                    className="cursor-pointer gap-2"
                                >
                                    <Plus className="size-4" strokeWidth={2.5} />
                                    Abrir caja
                                </Button>
                            </Can>
                        ) : miSesion ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {canEgreso ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setModal({ type: 'egreso' })}
                                        className="cursor-pointer gap-2"
                                    >
                                        <ArrowDownLeft className="size-4" strokeWidth={2.5} />
                                        Egreso
                                        {Number(miSesion.egresos_total ?? 0) > 0 ? (
                                            <span className="tabular-nums text-xs text-muted-foreground">
                                                {money(miSesion.egresos_total)}
                                            </span>
                                        ) : null}
                                    </Button>
                                ) : null}
                                {canClose ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setModal({ type: 'cerrar', sesion: miSesion })
                                        }
                                        className="cursor-pointer gap-2"
                                    >
                                        <Lock className="size-4" strokeWidth={2.5} />
                                        Cerrar mi caja
                                    </Button>
                                ) : null}
                            </div>
                        ) : undefined
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(sesion) => sesion.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.coincidencias} sesiones encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar en notas…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.estado}
                                onChange={(estado) =>
                                    applyFilter({ estado: estado as CajaEstado | 'todas' })
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
                                    filters.estado !== DEFAULT_ESTADO
                                        ? filters.estado
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Wallet}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay sesiones de caja'
                            }
                            description={
                                sinSedes
                                    ? 'Crea una sede antes de abrir caja.'
                                    : 'Abre el primer turno para empezar a cobrar.'
                            }
                        />
                    }
                />
            </div>

            <AbrirCajaModal
                open={modal.type === 'abrir'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                sedes={sedes}
            />

            <CerrarCajaModal
                open={modal.type === 'cerrar'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                sesion={modal.type === 'cerrar' ? modal.sesion : null}
            />

            <SesionEgresoModal
                open={modal.type === 'egreso'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                sesion={modal.type === 'egreso' ? miSesion : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Caja' },
        { title: 'Sesiones', href: '/caja/sesiones' },
    ],
};
