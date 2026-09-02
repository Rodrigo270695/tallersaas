import { Head, router } from '@inertiajs/react';
import { Inbox, RotateCcw, XCircle } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    PageHeader,
    StatBadge,
} from '@/components/data-page';
import type { DataTableColumn, FilterChip, StatBadgeVariant } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import { WhatsAppConnectCard } from '../components/whatsapp-connect-card';
import {
    estadoLabel,
    tipoLabel,
    type ColaPageProps,
    type NotificationRow,
} from '../types';

const ROUTE_URL = '/comunicaciones/cola';
const DEFAULT_PER_PAGE = 15;

function estadoVariant(estado: string): StatBadgeVariant {
    if (estado === 'pendiente') {
        return 'warning';
    }
    if (estado === 'procesando') {
        return 'info';
    }
    if (estado === 'fallido') {
        return 'danger';
    }

    return 'muted';
}

const EMPTY_STATS: ColaPageProps['stats'] = {
    pendiente: 0,
    procesando: 0,
    fallido: 0,
};

const EMPTY_PAGINATED: ColaPageProps['items'] = {
    data: [],
    current_page: 1,
    last_page: 1,
    per_page: DEFAULT_PER_PAGE,
    total: 0,
    from: null,
    to: null,
    path: ROUTE_URL,
    links: [],
};

export default function Index({
    items: paginated = EMPTY_PAGINATED,
    filters = {
        search: '',
        per_page: DEFAULT_PER_PAGE,
        estado: 'pendiente',
        tipo: null,
    },
    stats = EMPTY_STATS,
    estado_options = ['pendiente', 'procesando', 'fallido'],
    tipo_options = [],
    whatsapp = { enabled: false, configured: false, session: null },
}: ColaPageProps) {
    const { can } = usePermission();
    const canManage = can('comunicaciones-cola.manage');

    const { search, setSearch, isLoading, setPerPage, applyFilter } = useDataTablePage<{
        estado: string;
        tipo: string | null;
    }>({
        routeUrl: ROUTE_URL,
        initialFilters: filters,
        only: ['items', 'filters', 'stats', 'tipo_options', 'whatsapp'],
        errorMessage: 'No se pudo cargar la cola de WhatsApp.',
        storageKey: 'tallersaas.comunicaciones.cola.prefs',
        defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
    });

    const tipoFilterOptions: readonly FilterChip<string>[] = useMemo(
        () => [
            { value: 'all', label: 'Todos' },
            ...tipo_options.map((tipo) => ({
                value: tipo,
                label: tipoLabel(tipo),
            })),
        ],
        [tipo_options],
    );

    const cancelItem = useCallback((id: string) => {
        if (!window.confirm('¿Cancelar este mensaje?')) {
            return;
        }
        router.post(`/comunicaciones/cola/${id}/cancel`, {}, { preserveScroll: true });
    }, []);

    const retryItem = useCallback((id: string) => {
        if (!window.confirm('¿Reencolar este mensaje?')) {
            return;
        }
        router.post(`/comunicaciones/cola/${id}/retry`, {}, { preserveScroll: true });
    }, []);

    const columns = useMemo((): DataTableColumn<NotificationRow>[] => {
        return [
            {
                key: 'tipo',
                header: 'Tipo',
                cell: (row) => <span className="text-sm">{tipoLabel(row.tipo)}</span>,
            },
            {
                key: 'destinatario',
                header: 'Destinatario',
                cell: (row) => (
                    <div className="min-w-40">
                        <p className="text-sm font-medium">{row.destinatario_nombre ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{row.destinatario}</p>
                    </div>
                ),
            },
            {
                key: 'cuerpo',
                header: 'Mensaje',
                cell: (row) => (
                    <p className="max-w-md truncate text-sm text-muted-foreground" title={row.cuerpo}>
                        {row.cuerpo}
                    </p>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                cell: (row) => (
                    <StatBadge
                        label={estadoLabel(row.estado)}
                        value=""
                        variant={estadoVariant(row.estado)}
                    />
                ),
            },
            {
                key: 'enviar_at',
                header: 'Programado',
                cell: (row) =>
                    row.enviar_at ? new Date(row.enviar_at).toLocaleString('es-PE') : '—',
            },
            {
                key: 'intentos',
                header: 'Intentos',
                cell: (row) => (
                    <span className="text-sm tabular-nums">
                        {row.intentos}/{row.max_intentos}
                    </span>
                ),
            },
            {
                key: 'actions',
                header: '',
                cell: (row) =>
                    canManage ? (
                        <div className="flex justify-end gap-1">
                            {row.estado === 'fallido' ? (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-8 cursor-pointer"
                                    onClick={() => retryItem(row.id)}
                                    title="Reencolar"
                                >
                                    <RotateCcw className="size-4" />
                                </Button>
                            ) : null}
                            {row.estado === 'pendiente' || row.estado === 'fallido' ? (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-8 cursor-pointer text-destructive"
                                    onClick={() => cancelItem(row.id)}
                                    title="Cancelar"
                                >
                                    <XCircle className="size-4" />
                                </Button>
                            ) : null}
                        </div>
                    ) : null,
            },
        ];
    }, [canManage, cancelItem, retryItem]);

    return (
        <>
            <Head title="Cola saliente" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Cola saliente"
                    description="Mensajes de WhatsApp pendientes de envío o con error."
                    stats={estado_options.map((estado) => ({
                        label: estadoLabel(estado),
                        value: stats[estado] ?? 0,
                        variant: estadoVariant(estado),
                    }))}
                />

                <Can permission="comunicaciones-cola.view">
                    <WhatsAppConnectCard whatsapp={whatsapp} canManage={canManage} />
                </Can>

                <div className="flex flex-wrap gap-2">
                    {estado_options.map((estado) => (
                        <button
                            key={estado}
                            type="button"
                            className="cursor-pointer"
                            onClick={() => applyFilter({ estado })}
                        >
                            <StatBadge
                                label={estadoLabel(estado)}
                                value={stats[estado] ?? 0}
                                variant={estadoVariant(estado)}
                            />
                        </button>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            placeholder="Buscar por teléfono, nombre o texto…"
                            isSearching={isLoading}
                        >
                            {tipo_options.length > 0 ? (
                                <FilterChips
                                    ariaLabel="Filtrar por tipo"
                                    value={filters.tipo ?? 'all'}
                                    onChange={(v) => applyFilter({ tipo: v === 'all' ? null : v })}
                                    options={tipoFilterOptions}
                                    className="sm:min-w-56"
                                />
                            ) : null}
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                estado: filters.estado,
                                tipo: filters.tipo ?? undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Inbox}
                            title="Sin mensajes en esta cola"
                            description="Los avisos de OT lista y los recordatorios de cita aparecen aquí hasta enviarse."
                        />
                    }
                />
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Comunicaciones' },
        { title: 'Cola saliente', href: ROUTE_URL },
    ],
};
