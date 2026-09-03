import { TZDate } from '@date-fns/tz';
import { Head, router } from '@inertiajs/react';
import { CalendarDays, Filter, LayoutList, Plus, ScreenShare, Wrench } from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import { toastManager } from '@/lib/toast';
import citasRoutes from '@/routes/taller/citas';
import type { Paginated } from '@/types';
import { CitaConvertDialog } from './components/cita-convert-dialog';
import { CitaDeleteDialog } from './components/cita-delete-dialog';
import { CitaFormModal } from './components/cita-form-modal';
import { CitaRowActions } from './components/cita-row-actions';
import { CitasCalendar, shiftMes } from './components/citas-calendar';
import type {
    Cita,
    CitaEstado,
    CitaFilters,
    CitaFormPrefill,
    CitaRango,
    CitaStats,
    ClienteOption,
    MecanicoOption,
    SedeOption,
    VehiculoOption,
    VistaCita,
} from './types';

type IndexProps = {
    citas: Paginated<Cita>;
    citas_agenda: readonly Cita[];
    filters: CitaFilters;
    agenda_horario: { hora_inicio: string; hora_fin: string };
    timezone: string;
    stats: CitaStats;
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    mecanicos: readonly MecanicoOption[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create'; prefill?: CitaFormPrefill }
    | { type: 'edit'; cita: Cita }
    | { type: 'delete'; cita: Cita }
    | { type: 'convert'; cita: Cita };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO: CitaFilters['estado'] = 'todas';
const DEFAULT_RANGO: CitaRango = 'hoy';

const ESTADO_LABEL: Record<CitaEstado, string> = {
    programada: 'Programada',
    confirmada: 'Confirmada',
    en_recepcion: 'En recepción',
    convertida: 'Convertida',
    no_asistio: 'No asistió',
    cancelada: 'Cancelada',
};

const estadoClass: Record<CitaEstado, string> = {
    programada: 'bg-sky-50 text-sky-800',
    confirmada: 'bg-amber-50 text-amber-800',
    en_recepcion: 'bg-violet-50 text-violet-800',
    convertida: 'bg-emerald-50 text-emerald-800',
    no_asistio: 'bg-stone-100 text-stone-600',
    cancelada: 'bg-rose-50 text-rose-800',
};

const formatInicio = (iso: string): string => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
};

const currentMes = (tz: string): string => {
    const now = new TZDate(new Date(), tz);
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
};

export default function Index({
    citas: paginated,
    citas_agenda = [],
    filters,
    agenda_horario,
    timezone,
    stats,
    sedes,
    clientes,
    vehiculos,
    mecanicos,
}: IndexProps) {
    const { can } = usePermission();
    const canCreate = can('citas.create');
    const canUpdate = can('citas.update');
    const canDelete = can('citas.delete');
    const canConvert = can('citas.convert') && can('ordenes-trabajo.create');
    const showRowActions = canUpdate || canDelete || canConvert;

    const vista = (filters.vista ?? 'calendario') as VistaCita;
    const mesActivo = filters.mes ?? currentMes(timezone);

    const { search, setSearch, isLoading, sort, setSort, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: CitaFilters['estado'];
            rango: CitaRango;
            vista: VistaCita;
            mes: string | null;
        }>({
            routeUrl: citasRoutes.index().url,
            initialFilters: filters,
            only: [
                'citas',
                'citas_agenda',
                'filters',
                'stats',
                'agenda_horario',
                'timezone',
            ],
            errorMessage: 'No se pudo cargar la agenda.',
            storageKey: 'tallersaas.citas.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const rangoOptions: readonly FilterChip<CitaRango>[] = useMemo(
        () => [
            { value: 'hoy', label: 'Hoy' },
            { value: 'proximas', label: 'Próximas' },
            { value: 'todas', label: 'Todas' },
        ],
        [],
    );

    const estadoOptions: readonly FilterChip<CitaFilters['estado']>[] = useMemo(
        () => [
            { value: 'todas', label: 'Todas' },
            { value: 'programada', label: 'Programadas' },
            { value: 'confirmada', label: 'Confirmadas' },
            { value: 'en_recepcion', label: 'En recepción' },
            { value: 'convertida', label: 'Convertidas' },
            { value: 'no_asistio', label: 'No asistió' },
            { value: 'cancelada', label: 'Canceladas' },
        ],
        [],
    );

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openCreateOnDay = useCallback(
        (fecha: string, hora?: string) => setModal({ type: 'create', prefill: { fecha, hora } }),
        [],
    );
    const openEdit = useCallback((cita: Cita) => setModal({ type: 'edit', cita }), []);
    const openDelete = useCallback((cita: Cita) => setModal({ type: 'delete', cita }), []);
    const openConvert = useCallback((cita: Cita) => setModal({ type: 'convert', cita }), []);

    const handleReschedule = useCallback(
        (cita: Cita, fecha: string, hora?: string) => {
            if (!canUpdate || cita.estado === 'convertida') {
                return;
            }

            const current = new TZDate(cita.inicia_at, timezone);
            const pad = (n: number) => String(n).padStart(2, '0');
            const time =
                hora ?? `${pad(current.getHours())}:${pad(current.getMinutes())}`;
            const iniciaAt = `${fecha}T${time}`;
            const currentKey = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`;

            if (iniciaAt === currentKey) {
                return;
            }

            const target = new TZDate(`${iniciaAt}:00`, timezone);
            if (target.getTime() <= Date.now()) {
                toastManager.add({
                    type: 'warning',
                    title: 'No se puede reprogramar a una hora pasada.',
                });

                return;
            }

            router.put(
                citasRoutes.update(cita.id).url,
                {
                    sede_id: cita.sede_id,
                    cliente_id: cita.cliente_id,
                    vehiculo_id: cita.vehiculo_id,
                    assigned_user_id: cita.assigned_user_id ?? '',
                    inicia_at: iniciaAt,
                    duracion_minutos: cita.duracion_minutos,
                    estado: cita.estado,
                    motivo: cita.motivo ?? '',
                    notas: cita.notas ?? '',
                },
                {
                    preserveScroll: true,
                    only: ['citas', 'citas_agenda', 'filters', 'stats', 'flash', 'errors'],
                },
            );
        },
        [canUpdate, timezone],
    );

    const activeFiltersCount = useMemo(() => {
        let count = 0;

        if (filters.search) {
            count += 1;
        }

        if (filters.sort) {
            count += 1;
        }

        if (filters.per_page !== DEFAULT_PER_PAGE) {
            count += 1;
        }

        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }

        if (vista === 'lista' && filters.rango !== DEFAULT_RANGO) {
            count += 1;
        }

        return count;
    }, [filters, vista]);

    const columns = useMemo<DataTableColumn<Cita>[]>(() => {
        const base: DataTableColumn<Cita>[] = [
            {
                key: 'inicia_at',
                header: 'Fecha',
                sortable: true,
                cell: (cita) => (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{formatInicio(cita.inicia_at)}</span>
                        <span className="text-xs text-muted-foreground">
                            {cita.duracion_minutos} min
                            {cita.sede?.nombre ? ` · ${cita.sede.nombre}` : ''}
                        </span>
                    </div>
                ),
            },
            {
                key: 'cliente',
                header: 'Cliente / vehículo',
                cell: (cita) => (
                    <div className="flex flex-col">
                        <span className="text-sm">
                            {cita.cliente
                                ? `${cita.cliente.nombres} ${cita.cliente.apellidos ?? ''}`
                                : '—'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {cita.vehiculo?.placa ?? '—'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'motivo',
                header: 'Motivo',
                cell: (cita) => (
                    <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">
                        {cita.motivo || '—'}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                sortable: true,
                cell: (cita) => (
                    <div className="flex flex-col gap-1">
                        <span
                            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${estadoClass[cita.estado]}`}
                        >
                            {ESTADO_LABEL[cita.estado]}
                        </span>
                        {cita.orden_trabajo && (
                            <span className="font-mono text-xs text-muted-foreground">
                                {cita.orden_trabajo.numero}
                            </span>
                        )}
                    </div>
                ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (cita: Cita) => (
                    <div className="flex justify-end">
                        <CitaRowActions
                            cita={cita}
                            onEdit={openEdit}
                            onDelete={openDelete}
                            onConvert={openConvert}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            canConvert={canConvert}
                        />
                    </div>
                ),
                className: 'w-12',
            });
        }

        return base;
    }, [showRowActions, canUpdate, canDelete, canConvert, openEdit, openDelete, openConvert]);

    const vistaToggle = (
        <ToggleGroup
            type="single"
            value={vista}
            onValueChange={(value) => {
                if (value !== 'calendario' && value !== 'lista') {
                    return;
                }

                applyFilter({
                    vista: value,
                    mes: value === 'calendario' ? mesActivo : null,
                });
            }}
            variant="outline"
            className="justify-start"
            aria-label="Vista de citas"
        >
            <ToggleGroupItem value="calendario" className="cursor-pointer gap-1.5 px-3">
                <CalendarDays className="size-3.5" />
                Calendario
            </ToggleGroupItem>
            <ToggleGroupItem value="lista" className="cursor-pointer gap-1.5 px-3">
                <LayoutList className="size-3.5" />
                Lista
            </ToggleGroupItem>
        </ToggleGroup>
    );

    return (
        <>
            <Head title="Citas" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Citas"
                    description="Agenda de recepción: cliente, vehículo, sede, horario y estado."
                    stats={[
                        { label: 'Hoy', value: stats.hoy, variant: 'info', icon: CalendarDays },
                        { label: 'Próximas', value: stats.proximas, variant: 'warning', icon: Wrench },
                        { label: 'Filtros', value: activeFiltersCount, variant: 'warning', icon: Filter },
                        {
                            label: 'Coincidencias',
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        <Can permission="citas.create">
                            <Button type="button" onClick={openCreate} className="cursor-pointer gap-2">
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">Nueva cita</span>
                                <span className="sm:hidden">Nueva</span>
                            </Button>
                        </Can>
                    }
                />

                {vista === 'calendario' ? (
                    <div className="flex flex-col gap-4">
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por placa, cliente o motivo…"
                            className="sm:flex-row sm:items-center sm:gap-3"
                            searchWrapperClassName="w-full sm:max-w-none sm:min-w-0 sm:flex-1"
                            filtersClassName="w-full sm:w-auto sm:shrink-0 sm:justify-end"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                {vistaToggle}
                                <FilterChips
                                    ariaLabel="Filtrar por estado"
                                    value={filters.estado}
                                    onChange={(estado) => applyFilter({ estado })}
                                    options={estadoOptions}
                                />
                            </div>
                        </DataToolbar>

                        <CitasCalendar
                            citas={citas_agenda}
                            mes={mesActivo}
                            timeZone={timezone}
                            horaInicio={agenda_horario.hora_inicio}
                            horaFin={agenda_horario.hora_fin}
                            isLoading={isLoading}
                            canCreate={canCreate}
                            canUpdate={canUpdate}
                            onSelectCita={openEdit}
                            onScheduleDay={openCreateOnDay}
                            onReschedule={handleReschedule}
                            onPrevMonth={() =>
                                applyFilter({ vista: 'calendario', mes: shiftMes(mesActivo, -1) })
                            }
                            onNextMonth={() =>
                                applyFilter({ vista: 'calendario', mes: shiftMes(mesActivo, 1) })
                            }
                            onJumpToMonth={(mes) => applyFilter({ vista: 'calendario', mes })}
                            onToday={() =>
                                applyFilter({
                                    vista: 'calendario',
                                    mes: currentMes(timezone),
                                })
                            }
                        />
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={paginated.data}
                        rowKey={(cita) => cita.id}
                        sort={sort}
                        onSortChange={setSort}
                        isLoading={isLoading}
                        ariaLiveMessage={`${stats.coincidencias} citas encontradas`}
                        toolbar={
                            <DataToolbar
                                search={search}
                                onSearchChange={setSearch}
                                isSearching={isLoading}
                                placeholder="Buscar por placa, cliente o motivo…"
                                className="sm:flex-row sm:items-center sm:gap-3"
                                searchWrapperClassName="w-full sm:max-w-none sm:min-w-0 sm:flex-1"
                                filtersClassName="w-full sm:w-auto sm:shrink-0 sm:justify-end"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    {vistaToggle}
                                    <FilterChips
                                        ariaLabel="Filtrar por rango"
                                        value={filters.rango}
                                        onChange={(rango) => applyFilter({ rango })}
                                        options={rangoOptions}
                                    />
                                    <FilterChips
                                        ariaLabel="Filtrar por estado"
                                        value={filters.estado}
                                        onChange={(estado) => applyFilter({ estado })}
                                        options={estadoOptions}
                                    />
                                </div>
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
                                    rango:
                                        filters.rango !== DEFAULT_RANGO
                                            ? filters.rango
                                            : undefined,
                                    vista: 'lista',
                                }}
                            />
                        }
                        emptyState={
                            <EmptyState
                                icon={CalendarDays}
                                title={
                                    activeFiltersCount > 0 || filters.rango === 'hoy'
                                        ? 'Sin citas en este rango'
                                        : 'Aún no hay citas'
                                }
                                description={
                                    filters.rango === 'hoy' && activeFiltersCount === 0
                                        ? 'No hay recepciones agendadas para hoy.'
                                        : activeFiltersCount > 0
                                          ? 'Prueba ajustando la búsqueda o los filtros.'
                                          : sedes.length === 0
                                            ? 'Crea una sede antes de agendar la primera cita.'
                                            : 'Agenda la primera recepción del taller.'
                                }
                                action={
                                    canCreate ? (
                                        <Button
                                            type="button"
                                            onClick={openCreate}
                                            className="cursor-pointer gap-2"
                                        >
                                            <Plus className="size-4" strokeWidth={2.5} />
                                            Crear la primera cita
                                        </Button>
                                    ) : undefined
                                }
                            />
                        }
                    />
                )}
            </div>

            <CitaFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                cita={modal.type === 'edit' ? modal.cita : null}
                prefill={modal.type === 'create' ? modal.prefill : null}
                sedes={sedes}
                clientes={clientes}
                vehiculos={vehiculos}
                mecanicos={mecanicos}
            />

            <CitaDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                cita={modal.type === 'delete' ? modal.cita : null}
            />

            <CitaConvertDialog
                open={modal.type === 'convert'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                cita={modal.type === 'convert' ? modal.cita : null}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Taller' }, { title: 'Citas', href: '/taller/citas' }],
};
