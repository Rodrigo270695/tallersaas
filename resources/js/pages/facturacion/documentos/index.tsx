import { Head, router } from '@inertiajs/react';
import { ExternalLink, FileText, Filter, RefreshCw, ScreenShare } from 'lucide-react';
import { useMemo } from 'react';
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
import documentos from '@/routes/facturacion/documentos';
import type { Paginated } from '@/types';

type DocumentoEstado = 'pendiente' | 'emitido' | 'rechazado' | 'anulado';
type DocumentoEstadoFilter = 'todas' | DocumentoEstado;

type Documento = {
    id: string;
    venta_id: string;
    tipo_comprobante: number;
    tipo_label: string;
    numero_completo: string;
    receptor_nombre: string;
    receptor_num_doc: string;
    total: string | number;
    moneda: string;
    estado: DocumentoEstado;
    url_pdf: string | null;
    url_xml: string | null;
    error_mensaje: string | null;
    apisunat_mode: 'sandbox' | 'produccion' | null;
    emitido_at: string | null;
    venta: {
        id: string;
        numero: string;
        fel_estado: string | null;
    } | null;
};

type DocumentoFilters = {
    search: string;
    per_page: number;
    estado: DocumentoEstadoFilter;
};

type DocumentoStats = {
    total: number;
    emitidos: number;
    rechazados: number;
    coincidencias: number;
};

const DEFAULT_PER_PAGE = 10;
const DEFAULT_ESTADO: DocumentoEstadoFilter = 'todas';

const money = (value: string | number, moneda = 'PEN'): string =>
    Number(value).toLocaleString('es-PE', {
        style: 'currency',
        currency: moneda === 'USD' ? 'USD' : 'PEN',
    });

const estadoClass: Record<DocumentoEstado, string> = {
    emitido: 'bg-emerald-50 text-emerald-800',
    pendiente: 'bg-amber-50 text-amber-800',
    rechazado: 'bg-rose-50 text-rose-800',
    anulado: 'bg-stone-100 text-stone-700',
};

const estadoLabel: Record<DocumentoEstado, string> = {
    emitido: 'Emitido',
    pendiente: 'Pendiente',
    rechazado: 'Rechazado',
    anulado: 'Anulado',
};

export default function Index({
    documentos: paginated,
    filters,
    stats,
    fel_ready: felReady,
}: {
    documentos: Paginated<Documento>;
    filters: DocumentoFilters;
    stats: DocumentoStats;
    fel_ready: boolean;
}) {
    const { can } = usePermission();
    const canEmitir = can('documentos.create');

    const { search, setSearch, isLoading, setPerPage, applyFilter } =
        useDataTablePage<{ estado: DocumentoEstadoFilter }>({
            routeUrl: documentos.index().url,
            initialFilters: filters,
            only: ['documentos', 'filters', 'stats'],
            errorMessage: 'No se pudo cargar los comprobantes.',
            storageKey: 'tallersaas.documentos.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE, sort: null, direction: null },
        });

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) {
            count += 1;
        }
        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }

        return count;
    }, [filters.search, filters.estado]);

    const estadoOptions: FilterChip<DocumentoEstadoFilter>[] = [
        { value: 'todas', label: 'Todos' },
        { value: 'emitido', label: 'Emitidos' },
        { value: 'pendiente', label: 'Pendientes' },
        { value: 'rechazado', label: 'Rechazados' },
    ];

    const columns = useMemo<DataTableColumn<Documento>[]>(() => {
        const base: DataTableColumn<Documento>[] = [
            {
                key: 'numero',
                header: 'Comprobante',
                cell: (doc) => (
                    <div className="flex flex-col">
                        <span className="font-mono text-sm font-medium">{doc.numero_completo}</span>
                        <span className="text-xs text-muted-foreground">
                            {doc.tipo_label}
                            {doc.venta?.numero ? ` · ${doc.venta.numero}` : ''}
                        </span>
                    </div>
                ),
            },
            {
                key: 'receptor',
                header: 'Cliente',
                cell: (doc) => (
                    <div className="flex flex-col">
                        <span className="text-sm">{doc.receptor_nombre}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {doc.receptor_num_doc}
                        </span>
                    </div>
                ),
            },
            {
                key: 'total',
                header: 'Total',
                cell: (doc) => (
                    <span className="tabular-nums font-medium">{money(doc.total, doc.moneda)}</span>
                ),
            },
            {
                key: 'estado',
                header: 'Estado',
                cell: (doc) => (
                    <div className="flex flex-col gap-1">
                        <span
                            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${estadoClass[doc.estado]}`}
                        >
                            {estadoLabel[doc.estado]}
                        </span>
                        {doc.apisunat_mode === 'sandbox' && (
                            <span className="text-[11px] text-muted-foreground">Prueba</span>
                        )}
                        {doc.estado === 'rechazado' && doc.error_mensaje && (
                            <span className="max-w-xs text-xs text-rose-700">{doc.error_mensaje}</span>
                        )}
                    </div>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                cell: (doc) => (
                    <div className="flex justify-end gap-1">
                        {doc.url_pdf && (
                            <Button variant="ghost" size="sm" className="cursor-pointer gap-1.5" asChild>
                                <a href={doc.url_pdf} target="_blank" rel="noreferrer">
                                    <ExternalLink className="size-3.5" />
                                    PDF
                                </a>
                            </Button>
                        )}
                        {canEmitir && (doc.estado === 'rechazado' || doc.estado === 'pendiente') && (
                            <Can permission="documentos.create">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer gap-1.5"
                                    onClick={() =>
                                        router.post(documentos.emitir(doc.venta_id).url, {}, { preserveScroll: true })
                                    }
                                >
                                    <RefreshCw className="size-3.5" />
                                    Reintentar
                                </Button>
                            </Can>
                        )}
                    </div>
                ),
                className: 'w-40',
            },
        ];

        return base;
    }, [canEmitir]);

    return (
        <>
            <Head title="Comprobantes SUNAT" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Comprobantes"
                    description={
                        felReady
                            ? 'Boletas y facturas emitidas a SUNAT vía APISUNAT.'
                            : 'Configura APISUNAT en Configuración general para emitir boletas y facturas.'
                    }
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: FileText },
                        { label: 'Emitidos', value: stats.emitidos, variant: 'success', icon: FileText },
                        { label: 'Rechazados', value: stats.rechazados, variant: 'warning', icon: Filter },
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
                    rowKey={(doc) => doc.id}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.coincidencias} comprobantes encontrados`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por número, cliente o documento…"
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
                                estado:
                                    filters.estado !== DEFAULT_ESTADO ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={FileText}
                            title={activeFiltersCount > 0 ? 'Sin resultados' : 'Aún no hay comprobantes'}
                            description="Al cobrar una orden elige boleta o factura para emitir a SUNAT."
                        />
                    }
                />
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Facturación' },
        { title: 'Comprobantes', href: '/facturacion/documentos' },
    ],
};
