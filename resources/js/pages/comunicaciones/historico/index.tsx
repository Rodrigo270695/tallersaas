import { Head } from '@inertiajs/react';
import { History } from 'lucide-react';
import { useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    PageHeader,
} from '@/components/data-page';
import type { DataTableColumn } from '@/components/data-page';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import {
    tipoLabel,
    type HistoricoPageProps,
    type NotificationRow,
} from '../types';

const ROUTE_URL = '/comunicaciones/historico';
const DEFAULT_PER_PAGE = 15;

const EMPTY_PAGINATED: HistoricoPageProps['items'] = {
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
        estado: 'enviado',
        tipo: null,
    },
    stats = { enviado: 0 },
}: HistoricoPageProps) {
    const { search, setSearch, isLoading, setPerPage } = useDataTablePage<{
        tipo: string | null;
    }>({
        routeUrl: ROUTE_URL,
        initialFilters: filters,
        only: ['items', 'filters', 'stats', 'tipo_options'],
        errorMessage: 'No se pudo cargar el histórico de WhatsApp.',
        storageKey: 'tallersaas.comunicaciones.historico.prefs',
        defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
    });

    const columns = useMemo((): DataTableColumn<NotificationRow>[] => {
        return [
            {
                key: 'tipo',
                header: 'Tipo',
                cell: (row) => tipoLabel(row.tipo),
            },
            {
                key: 'destinatario',
                header: 'Destinatario',
                cell: (row) => (
                    <div>
                        <p className="text-sm font-medium">{row.destinatario_nombre ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{row.destinatario}</p>
                    </div>
                ),
            },
            {
                key: 'cuerpo',
                header: 'Mensaje',
                cell: (row) => (
                    <p className="max-w-lg truncate text-sm text-muted-foreground" title={row.cuerpo}>
                        {row.cuerpo}
                    </p>
                ),
            },
            {
                key: 'enviar_at',
                header: 'Enviado',
                cell: (row) =>
                    row.enviar_at ? new Date(row.enviar_at).toLocaleString('es-PE') : '—',
            },
            {
                key: 'proveedor',
                header: 'ID',
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.proveedor_msg_id ?? '—'}
                    </span>
                ),
            },
        ];
    }, []);

    return (
        <>
            <Head title="Histórico" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Histórico"
                    description="Mensajes de WhatsApp enviados por OpenWA."
                    stats={[{ label: 'Enviados', value: stats.enviado ?? 0, variant: 'success' }]}
                />

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
                        />
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
                            icon={History}
                            title="Aún no hay mensajes enviados"
                            description="Cuando OpenWA entregue un aviso, aparecerá aquí."
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
        { title: 'Histórico', href: ROUTE_URL },
    ],
};
