import { Head, router, useForm } from '@inertiajs/react';
import { Plus, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { FormField, FormModal, FormSection } from '@/components/forms';
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
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';
import { soloDecimal } from '@/lib/numeros';
import type { Paginated } from '@/types';
import { SiniestroRowActions } from './components/siniestro-row-actions';

type AseguradoraOption = { id: string; nombre: string };

type OrdenOption = {
    id: string;
    numero: string;
    total: string;
    placa: string | null;
    numero_poliza: string | null;
    cobertura_pct: string | null;
    aseguradora_id: string | null;
};

type Siniestro = {
    id: string;
    numero: string;
    estado: string;
    cobertura_pct: string | null;
    monto_reclamado: string;
    monto_seguro: string;
    monto_cliente: string;
    notas: string | null;
    orden_trabajo_id: string;
    aseguradora_id: string;
    aseguradora?: { id: string; nombre: string } | null;
    orden_trabajo?: {
        id: string;
        numero: string;
        total: string;
        vehiculo?: { id: string; placa: string } | null;
    } | null;
};

type Props = {
    siniestros: Paginated<Siniestro>;
    filters: { search: string; estado: string };
    stats: { total: number; abiertos: number; coincidencias: number };
    aseguradoras: AseguradoraOption[];
    ordenes: OrdenOption[];
};

const estados = [
    { value: 'abierto', label: 'Abierto' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'rechazado', label: 'Rechazado' },
    { value: 'cerrado', label: 'Cerrado' },
];

const estadoClass: Record<string, string> = {
    abierto: 'bg-amber-100 text-amber-950 ring-amber-300/80',
    aprobado: 'bg-emerald-100 text-emerald-900 ring-emerald-300/80',
    rechazado: 'bg-red-100 text-red-900 ring-red-300/80',
    cerrado: 'bg-stone-100 text-stone-700 ring-stone-300/80',
};

const money = (value: string | number | null): string =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value ?? 0));

const emptyForm = {
    orden_trabajo_id: '',
    aseguradora_id: '',
    numero: '',
    estado: 'abierto',
    cobertura_pct: '',
    monto_reclamado: '',
    monto_seguro: '',
    monto_cliente: '',
    numero_poliza: '',
    notas: '',
};

export default function Index({ siniestros, filters, stats, aseguradoras, ordenes }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Siniestro | null>(null);
    const form = useForm(emptyForm);
    const { remember, requestClose } = useUnsavedFormGuard(form.data, setOpen);

    const split = useMemo(() => {
        const reclamado = Number(form.data.monto_reclamado) || 0;
        const pct = form.data.cobertura_pct === '' ? null : Number(form.data.cobertura_pct);
        const seguro =
            pct !== null && !Number.isNaN(pct)
                ? Math.round(reclamado * Math.min(100, Math.max(0, pct))) / 100
                : Number(form.data.monto_seguro) || 0;
        const cliente = Math.max(0, Math.round((reclamado - seguro) * 100) / 100);

        return { seguro, cliente };
    }, [form.data.cobertura_pct, form.data.monto_reclamado, form.data.monto_seguro]);

    const openCreate = () => {
        setEditing(null);
        remember(emptyForm);
        form.setData(emptyForm);
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (row: Siniestro) => {
        setEditing(row);
        const orden = ordenes.find((item) => item.id === row.orden_trabajo_id);
        const initial = {
            orden_trabajo_id: row.orden_trabajo_id,
            aseguradora_id: row.aseguradora_id,
            numero: row.numero,
            estado: row.estado,
            cobertura_pct: row.cobertura_pct ?? '',
            monto_reclamado: row.monto_reclamado,
            monto_seguro: row.monto_seguro,
            monto_cliente: row.monto_cliente,
            numero_poliza: orden?.numero_poliza ?? '',
            notas: row.notas ?? '',
        };
        remember(initial);
        form.setData(initial);
        form.clearErrors();
        setOpen(true);
    };

    const applyOrden = (ordenId: string) => {
        const orden = ordenes.find((item) => item.id === ordenId);
        form.setData((current) => ({
            ...current,
            orden_trabajo_id: ordenId,
            monto_reclamado: current.monto_reclamado || orden?.total || '',
            aseguradora_id: current.aseguradora_id || orden?.aseguradora_id || '',
            numero_poliza: current.numero_poliza || orden?.numero_poliza || '',
            cobertura_pct: current.cobertura_pct || orden?.cobertura_pct || '',
        }));
    };

    const submit = () => {
        const opts = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) {
            form.put(`/taller/siniestros/${editing.id}`, opts);
            return;
        }
        form.post('/taller/siniestros', opts);
    };

    const columns: DataTableColumn<Siniestro>[] = [
        {
            key: 'numero',
            header: 'Siniestro',
            cell: (row) => (
                <div>
                    <p className="font-medium">{row.numero}</p>
                    <p className="text-xs text-muted-foreground">
                        {row.orden_trabajo?.numero ?? '—'}
                        {row.orden_trabajo?.vehiculo?.placa ? ` · ${row.orden_trabajo.vehiculo.placa}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'aseguradora',
            header: 'Aseguradora',
            cell: (row) => row.aseguradora?.nombre ?? '—',
        },
        {
            key: 'reparto',
            header: 'Reparto',
            cell: (row) => (
                <div className="text-xs">
                    <p>Seguro {money(row.monto_seguro)}</p>
                    <p>Cliente {money(row.monto_cliente)}</p>
                </div>
            ),
        },
        {
            key: 'estado',
            header: 'Estado',
            cell: (row) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${estadoClass[row.estado] ?? estadoClass.cerrado}`}
                >
                    {estados.find((item) => item.value === row.estado)?.label ?? row.estado}
                </span>
            ),
        },
        {
            key: 'acciones',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            className: 'w-12',
            cell: (row) => (
                <div className="flex justify-end">
                    <SiniestroRowActions
                        numero={row.numero}
                        onEdit={() => openEdit(row)}
                        onDelete={() =>
                            router.delete(`/taller/siniestros/${row.id}`, { preserveScroll: true })
                        }
                    />
                </div>
            ),
        },
    ];

    const estadoOptions: FilterChip[] = [
        { value: 'todos', label: 'Todos' },
        ...estados.map((item) => ({ value: item.value, label: item.label })),
    ];

    const canCreate =
        form.data.orden_trabajo_id !== '' &&
        form.data.aseguradora_id !== '' &&
        form.data.numero.trim() !== '' &&
        form.data.monto_reclamado !== '';

    return (
        <>
            <Head title="Siniestros" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Siniestros"
                    description="Cobertura y lo que paga el seguro frente a lo que paga el cliente. El cliente lo consulta en /placa."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: ShieldAlert },
                        { label: 'Abiertos', value: stats.abiertos, variant: 'primary', icon: ShieldAlert },
                        { label: 'Coincidencias', value: stats.coincidencias, variant: 'primary', icon: ShieldAlert },
                    ]}
                    action={
                        <Can permission="siniestros.create">
                            <Button type="button" className="cursor-pointer gap-2" onClick={openCreate}>
                                <Plus className="size-4" />
                                Nuevo siniestro
                            </Button>
                        </Can>
                    }
                />
                <DataTable
                    columns={columns}
                    data={siniestros.data}
                    rowKey={(row) => row.id}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={(value) => {
                                setSearch(value);
                                router.get(
                                    '/taller/siniestros',
                                    { search: value, estado: filters.estado },
                                    { preserveState: true, replace: true },
                                );
                            }}
                            placeholder="Buscar por siniestro, orden o placa"
                        >
                            <FilterChips
                                ariaLabel="Filtrar siniestros"
                                value={filters.estado}
                                onChange={(estado) =>
                                    router.get('/taller/siniestros', { search, estado }, { preserveState: true })
                                }
                                options={estadoOptions}
                            />
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={siniestros}
                            preservedQuery={{
                                search: filters.search || undefined,
                                estado: filters.estado !== 'todos' ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ShieldAlert}
                            title="No hay siniestros"
                            description="Registra el primero a partir de una orden de trabajo."
                        />
                    }
                />
            </div>

            <FormModal
                open={open}
                onOpenChange={requestClose}
                title={editing ? 'Editar siniestro' : 'Nuevo siniestro'}
                description="El porcentaje de cobertura calcula el reparto. Si lo dejas vacío, usa el monto del seguro."
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!canCreate) {
                        return;
                    }
                    submit();
                }}
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => requestClose(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing || !canCreate}>
                            {editing ? 'Guardar' : 'Crear'}
                        </Button>
                    </>
                }
            >
                <FormSection index={0} title="Caso" icon={ShieldAlert} columns={1}>
                    <FormField id="sin-orden" label="Orden" required error={form.errors.orden_trabajo_id}>
                        <Select value={form.data.orden_trabajo_id || undefined} onValueChange={applyOrden}>
                            <SelectTrigger id="sin-orden" className="h-9 w-full">
                                <SelectValue placeholder="Orden de trabajo" />
                            </SelectTrigger>
                            <SelectContent>
                                {ordenes.map((orden) => (
                                    <SelectItem key={orden.id} value={orden.id}>
                                        {orden.numero}
                                        {orden.placa ? ` · ${orden.placa}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="sin-aseg" label="Aseguradora" required error={form.errors.aseguradora_id}>
                        <Select
                            value={form.data.aseguradora_id || undefined}
                            onValueChange={(value) => form.setData('aseguradora_id', value)}
                        >
                            <SelectTrigger id="sin-aseg" className="h-9 w-full">
                                <SelectValue placeholder="Aseguradora" />
                            </SelectTrigger>
                            <SelectContent>
                                {aseguradoras.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="sin-numero" label="Número de siniestro" required error={form.errors.numero}>
                        <Input
                            id="sin-numero"
                            value={form.data.numero}
                            onChange={(event) => form.setData('numero', event.target.value)}
                        />
                    </FormField>
                    <FormField id="sin-estado" label="Estado" required error={form.errors.estado}>
                        <Select value={form.data.estado} onValueChange={(value) => form.setData('estado', value)}>
                            <SelectTrigger id="sin-estado" className="h-9 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {estados.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="sin-poliza" label="Póliza del vehículo" error={form.errors.numero_poliza}>
                        <Input
                            id="sin-poliza"
                            value={form.data.numero_poliza}
                            onChange={(event) => form.setData('numero_poliza', event.target.value)}
                        />
                    </FormField>
                    <FormField id="sin-pct" label="Cobertura %" error={form.errors.cobertura_pct}>
                        <Input
                            id="sin-pct"
                            inputMode="decimal"
                            value={form.data.cobertura_pct}
                            onChange={(event) => form.setData('cobertura_pct', soloDecimal(event.target.value, 2, 3))}
                            placeholder="80"
                        />
                    </FormField>
                    <FormField id="sin-reclamado" label="Monto reclamado" required error={form.errors.monto_reclamado}>
                        <Input
                            id="sin-reclamado"
                            inputMode="decimal"
                            value={form.data.monto_reclamado}
                            onChange={(event) => form.setData('monto_reclamado', soloDecimal(event.target.value))}
                        />
                    </FormField>
                    <FormField id="sin-seguro" label="Lo que paga el seguro" error={form.errors.monto_seguro}>
                        <Input
                            id="sin-seguro"
                            inputMode="decimal"
                            value={form.data.cobertura_pct !== '' ? String(split.seguro) : form.data.monto_seguro}
                            disabled={form.data.cobertura_pct !== ''}
                            onChange={(event) => form.setData('monto_seguro', soloDecimal(event.target.value))}
                        />
                    </FormField>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950 ring-1 ring-emerald-200">
                            <p className="text-xs font-medium tracking-wide uppercase">Paga el seguro</p>
                            <p className="text-lg font-semibold">{money(split.seguro)}</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-900 ring-1 ring-stone-200">
                            <p className="text-xs font-medium tracking-wide uppercase">Paga el cliente</p>
                            <p className="text-lg font-semibold">{money(split.cliente)}</p>
                        </div>
                    </div>
                    <FormField id="sin-notas" label="Notas" error={form.errors.notas}>
                        <Textarea
                            id="sin-notas"
                            value={form.data.notas}
                            onChange={(event) => form.setData('notas', event.target.value)}
                        />
                    </FormField>
                </FormSection>
            </FormModal>
        </>
    );
}
