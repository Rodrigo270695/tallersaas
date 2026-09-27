import { Head, Link, router, useForm } from '@inertiajs/react';
import { Droplets, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Can } from '@/components/can';
import { DataPagination, DataTable, DataToolbar, EmptyState, FilterChips, PageHeader } from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Paginated } from '@/types';

type SedeOption = { id: string; nombre: string; codigo: string };
type ClienteOption = { id: string; nombre: string };
type VehiculoOption = { id: string; cliente_id: string; placa: string };

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
    clientes: ClienteOption[];
    vehiculos: VehiculoOption[];
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

export default function Index({ lavados, filters, stats, sedes, clientes, vehiculos }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [open, setOpen] = useState(false);
    const form = useForm({
        sede_id: sedes[0]?.id ?? '',
        cliente_id: '',
        vehiculo_id: '',
        placa: '',
        notas: '',
    });

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

    const vehiculosCliente = useMemo(
        () => vehiculos.filter((vehiculo) => vehiculo.cliente_id === form.data.cliente_id),
        [vehiculos, form.data.cliente_id],
    );

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

    const submit = () => {
        form.post('/taller/lavados', { preserveScroll: true });
    };

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

            <FormModal
                open={open}
                onOpenChange={setOpen}
                title="Nuevo lavado"
                description="Cliente y placa. Los cargos se agregan en la precuenta."
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Crear lavado
                        </Button>
                    </>
                }
            >
                <FormSection title="Recepción" columns={2}>
                    <FormField id="lavado-sede" label="Sede" required error={form.errors.sede_id}>
                        <Select
                            value={form.data.sede_id || undefined}
                            onValueChange={(value) => form.setData('sede_id', value)}
                        >
                            <SelectTrigger id="lavado-sede">
                                <SelectValue placeholder="Selecciona sede" />
                            </SelectTrigger>
                            <SelectContent>
                                {sedes.map((sede) => (
                                    <SelectItem key={sede.id} value={sede.id}>
                                        {sede.nombre} ({sede.codigo})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="lavado-cliente" label="Cliente" required error={form.errors.cliente_id}>
                        <Select
                            value={form.data.cliente_id || undefined}
                            onValueChange={(value) =>
                                form.setData({ ...form.data, cliente_id: value, vehiculo_id: '', placa: '' })
                            }
                        >
                            <SelectTrigger id="lavado-cliente">
                                <SelectValue placeholder="Selecciona cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clientes.map((cliente) => (
                                    <SelectItem key={cliente.id} value={cliente.id}>
                                        {cliente.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="lavado-vehiculo" label="Vehículo" error={form.errors.vehiculo_id}>
                        <Select
                            value={form.data.vehiculo_id || '__ninguno__'}
                            onValueChange={(value) => {
                                const vehiculo = vehiculosCliente.find((item) => item.id === value);
                                form.setData({
                                    ...form.data,
                                    vehiculo_id: value === '__ninguno__' ? '' : value,
                                    placa: vehiculo?.placa ?? form.data.placa,
                                });
                            }}
                            disabled={!form.data.cliente_id}
                        >
                            <SelectTrigger id="lavado-vehiculo">
                                <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__ninguno__">Sin vehículo</SelectItem>
                                {vehiculosCliente.map((vehiculo) => (
                                    <SelectItem key={vehiculo.id} value={vehiculo.id}>
                                        {vehiculo.placa}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="lavado-placa" label="Placa" required error={form.errors.placa}>
                        <Input
                            id="lavado-placa"
                            value={form.data.placa}
                            onChange={(event) => form.setData('placa', event.target.value.toUpperCase())}
                            placeholder="ABC-123"
                        />
                    </FormField>
                    <FormField id="lavado-notas" label="Notas" error={form.errors.notas} className="sm:col-span-2">
                        <Textarea
                            id="lavado-notas"
                            value={form.data.notas}
                            onChange={(event) => form.setData('notas', event.target.value)}
                        />
                    </FormField>
                </FormSection>
            </FormModal>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Taller' }, { title: 'Car wash', href: '/taller/lavados' }],
};
