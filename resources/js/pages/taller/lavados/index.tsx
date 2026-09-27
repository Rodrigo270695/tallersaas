import { Head, Link, router } from '@inertiajs/react';
import { Droplets, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Can } from '@/components/can';
import { DataPagination, DataTable, DataToolbar, EmptyState, FilterChips, PageHeader } from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Paginated } from '@/types';
import { LavadoFormModal } from './components/lavado-form-modal';

type SedeOption = { id: string; nombre: string; codigo: string };

type LavadoRow = {
    id: string;
    numero: string;
    placa: string;
    estado: 'abierto' | 'cobrado' | 'anulado';
    cliente?: { nombres: string; apellidos: string | null } | null;
    sede?: { nombre: string } | null;
    lineas?: { cantidad: string; precio_unitario: string }[];
};

type Props = {
    lavados: Paginated<LavadoRow>;
    filters: { search: string; estado: string; per_page: number };
    stats: { total: number; abiertos: number; cobrados: number; coincidencias: number };
    sedes: SedeOption[];
};

const money = (value: number): string =>
    value.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

const estadoLabel: Record<LavadoRow['estado'], string> = {
    abierto: 'Abierto',
    cobrado: 'Cobrado',
    anulado: 'Anulado',
};

function precuenta(lavado: LavadoRow): number {
    return (lavado.lineas ?? []).reduce(
        (sum, linea) => sum + Number(linea.cantidad) * Number(linea.precio_unitario),
        0,
    );
}

export default function Index({ lavados, filters, stats, sedes }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            if (search === filters.search) {
                return;
            }
            router.get(
                '/taller/lavados',
                { search, estado: filters.estado },
                { preserveState: true, replace: true },
            );
        }, 350);

        return () => window.clearTimeout(handle);
    }, [search, filters.search, filters.estado]);

    const columns = useMemo<DataTableColumn<LavadoRow>[]>(
        () => [
            {
                key: 'numero',
                header: 'Lavado',
                cell: (lavado) => (
                    <Link
                        href={`/taller/lavados/${lavado.id}`}
                        className="font-mono text-sm font-medium text-brand-700 hover:underline"
                    >
                        {lavado.numero}
                    </Link>
                ),
            },
            {
                key: 'placa',
                header: 'Placa',
                cell: (lavado) => <span className="font-mono text-xs">{lavado.placa}</span>,
            },
            {
                key: 'cliente',
                header: 'Cliente',
                cell: (lavado) =>
                    [lavado.cliente?.nombres, lavado.cliente?.apellidos].filter(Boolean).join(' ') || '—',
            },
            {
                key: 'estado',
                header: 'Estado',
                cell: (lavado) => (
                    <Badge variant={lavado.estado === 'cobrado' ? 'default' : 'secondary'}>
                        {estadoLabel[lavado.estado]}
                    </Badge>
                ),
            },
            {
                key: 'total',
                header: 'Precuenta',
                align: 'right',
                cell: (lavado) => <span className="tabular-nums">{money(precuenta(lavado))}</span>,
            },
        ],
        [],
    );

    const chips: FilterChip[] = [
        { value: 'todos', label: 'Todos' },
        { value: 'abierto', label: 'Abiertos' },
        { value: 'cobrado', label: 'Cobrados' },
        { value: 'anulado', label: 'Anulados' },
    ];

    return (
        <>
            <Head title="Car wash" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Car wash"
                    description="Lavados de mostrador. Arma la precuenta y cobra con ticket."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Droplets },
                        { label: 'Abiertos', value: stats.abiertos, variant: 'warning', icon: Droplets },
                        { label: 'Cobrados', value: stats.cobrados, variant: 'success', icon: Droplets },
                        { label: 'Coincidencias', value: stats.coincidencias, variant: 'primary', icon: Droplets },
                    ]}
                    action={
                        <Can permission="lavados.create">
                            <Button type="button" className="cursor-pointer gap-2" onClick={() => setOpen(true)}>
                                <Plus className="size-4" />
                                Nuevo lavado
                            </Button>
                        </Can>
                    }
                />

                <DataToolbar
                    search={search}
                    onSearchChange={setSearch}
                    placeholder="Buscar por número, placa o cliente…"
                >
                    <FilterChips
                        ariaLabel="Filtrar lavados por estado"
                        options={chips}
                        value={filters.estado}
                        onChange={(estado) =>
                            router.get(
                                '/taller/lavados',
                                { search: filters.search, estado },
                                { preserveState: true },
                            )
                        }
                    />
                </DataToolbar>

                <DataTable
                    columns={columns}
                    data={lavados.data}
                    rowKey={(lavado) => lavado.id}
                    emptyState={
                        <EmptyState
                            icon={Droplets}
                            title="Sin lavados"
                            description="Registra el primer car wash para armar cargos y cobrar."
                        />
                    }
                />

                <DataPagination
                    meta={lavados}
                    preservedQuery={{ search: filters.search, estado: filters.estado }}
                />
            </div>

            <LavadoFormModal open={open} onOpenChange={setOpen} sedes={sedes} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Taller' }, { title: 'Car wash', href: '/taller/lavados' }],
};
