import { Head, router, useForm } from '@inertiajs/react';
import { Plus, SquareParking } from 'lucide-react';
import { useState } from 'react';
import { Can } from '@/components/can';
import { DataTable, DataToolbar, EmptyState, FilterChips, PageHeader } from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';
import { PuestoRowActions } from './components/puesto-row-actions';

type SedeOption = { id: string; nombre: string };

type Puesto = {
    id: string;
    sede_id: string;
    nombre: string;
    activo: boolean;
    sede?: { id: string; nombre: string } | null;
};

type Props = {
    puestos: {
        data: Puesto[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: { search: string; estado: string; per_page: number };
    stats: { total: number; activos: number; coincidencias: number };
    sedes: SedeOption[];
};

export default function Index({ puestos, filters, stats, sedes }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Puesto | null>(null);
    const form = useForm({
        sede_id: sedes[0]?.id ?? '',
        nombre: '',
        activo: true,
    });
    const { remember, requestClose } = useUnsavedFormGuard(form.data, setOpen);

    const openCreate = () => {
        setEditing(null);
        const initial = { sede_id: sedes[0]?.id ?? '', nombre: '', activo: true };
        remember(initial);
        form.setData(initial);
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (puesto: Puesto) => {
        setEditing(puesto);
        const initial = {
            sede_id: puesto.sede_id,
            nombre: puesto.nombre,
            activo: puesto.activo,
        };
        remember(initial);
        form.setData(initial);
        form.clearErrors();
        setOpen(true);
    };

    const submit = () => {
        const opts = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) {
            form.put(`/taller/puestos/${editing.id}`, opts);
            return;
        }
        form.post('/taller/puestos', opts);
    };

    const columns: DataTableColumn<Puesto>[] = [
        {
            key: 'nombre',
            header: 'Puesto',
            cell: (row) => <span className="font-medium">{row.nombre}</span>,
        },
        {
            key: 'sede',
            header: 'Sede',
            cell: (row) => row.sede?.nombre ?? '—',
        },
        {
            key: 'activo',
            header: 'Estado',
            cell: (row) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                        row.activo
                            ? 'bg-emerald-100 text-emerald-900 ring-emerald-300/80'
                            : 'bg-stone-100 text-stone-700 ring-stone-300/80'
                    }`}
                >
                    {row.activo ? 'Activo' : 'Inactivo'}
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
                    <PuestoRowActions
                        nombre={row.nombre}
                        onEdit={() => openEdit(row)}
                        onDelete={() =>
                            router.delete(`/taller/puestos/${row.id}`, { preserveScroll: true })
                        }
                    />
                </div>
            ),
        },
    ];

    const estadoOptions: FilterChip[] = [
        { value: 'todos', label: 'Todos' },
        { value: 'activos', label: 'Activos' },
        { value: 'inactivos', label: 'Inactivos' },
    ];

    return (
        <>
            <Head title="Puestos" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Puestos"
                    description="Bahías o espacios donde se recibe el vehículo."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: SquareParking },
                        { label: 'Activos', value: stats.activos, variant: 'primary', icon: SquareParking },
                        { label: 'Coincidencias', value: stats.coincidencias, variant: 'primary', icon: SquareParking },
                    ]}
                    action={
                        <Can permission="puestos.create">
                            <Button type="button" className="cursor-pointer gap-2" onClick={openCreate}>
                                <Plus className="size-4" />
                                Nuevo puesto
                            </Button>
                        </Can>
                    }
                />
                <DataTable
                    columns={columns}
                    data={puestos.data}
                    rowKey={(row) => row.id}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={(value) => {
                                setSearch(value);
                                router.get(
                                    '/taller/puestos',
                                    { search: value, estado: filters.estado },
                                    { preserveState: true, replace: true },
                                );
                            }}
                            placeholder="Buscar puesto…"
                        >
                            <FilterChips
                                ariaLabel="Filtrar puestos"
                                value={filters.estado}
                                onChange={(estado) =>
                                    router.get('/taller/puestos', { search, estado }, { preserveState: true })
                                }
                                options={estadoOptions}
                            />
                        </DataToolbar>
                    }
                    emptyState={
                        <EmptyState
                            icon={SquareParking}
                            title="No hay puestos"
                            description="Crea la primera bahía de esta sede."
                        />
                    }
                />
            </div>

            <FormModal
                open={open}
                onOpenChange={requestClose}
                title={editing ? 'Editar puesto' : 'Nuevo puesto'}
                description="Un puesto pertenece a una sede."
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => requestClose(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {editing ? 'Guardar' : 'Crear'}
                        </Button>
                    </>
                }
            >
                <FormSection index={0} title="Datos" icon={SquareParking} columns={1}>
                    <FormField id="puesto-sede" label="Sede" required error={form.errors.sede_id}>
                        <Select
                            value={form.data.sede_id || undefined}
                            onValueChange={(value) => form.setData('sede_id', value)}
                        >
                            <SelectTrigger id="puesto-sede" className="h-9 w-full">
                                <SelectValue placeholder="Sede" />
                            </SelectTrigger>
                            <SelectContent>
                                {sedes.map((sede) => (
                                    <SelectItem key={sede.id} value={sede.id}>
                                        {sede.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="puesto-nombre" label="Nombre" required error={form.errors.nombre}>
                        <Input
                            id="puesto-nombre"
                            value={form.data.nombre}
                            onChange={(event) => form.setData('nombre', event.target.value)}
                            placeholder="Bahía 1"
                        />
                    </FormField>
                    <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                            checked={form.data.activo}
                            onCheckedChange={(checked) => form.setData('activo', checked === true)}
                        />
                        <span className="text-sm">Puesto activo</span>
                    </label>
                </FormSection>
            </FormModal>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Taller' }, { title: 'Puestos', href: '/taller/puestos' }],
};
