import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Shield } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { DocumentNumberLookupField, FormField, FormModal, FormSection, soloDigitosDocumento } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';
import { toastManager } from '@/lib/toast';
import type { Paginated } from '@/types';
import { AseguradoraRowActions } from './components/aseguradora-row-actions';

type Aseguradora = {
    id: string;
    nombre: string;
    ruc: string | null;
    telefono: string | null;
    email: string | null;
    activo: boolean;
};

type Props = {
    aseguradoras: Paginated<Aseguradora>;
    filters: { search: string; estado: string };
    stats: { total: number; activos: number; coincidencias: number };
};

const emptyForm = {
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    activo: true,
};

type ConsultaRuc = {
    success?: boolean;
    message?: string;
    code?: string;
    data?: {
        ruc?: string;
        razon_social?: string;
    };
};

export default function Index({ aseguradoras, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Aseguradora | null>(null);
    const form = useForm(emptyForm);
    const { remember, requestClose } = useUnsavedFormGuard(form.data, setOpen);
    const [consultando, setConsultando] = useState(false);
    const lastConsultaKeyRef = useRef<string | null>(null);
    const ruc = soloDigitosDocumento(form.data.ruc, 11);
    const rucCompleto = ruc.length === 11;

    const openCreate = () => {
        setEditing(null);
        lastConsultaKeyRef.current = null;
        remember(emptyForm);
        form.setData(emptyForm);
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (row: Aseguradora) => {
        setEditing(row);
        const initial = {
            nombre: row.nombre,
            ruc: row.ruc ?? '',
            telefono: row.telefono ?? '',
            email: row.email ?? '',
            activo: row.activo,
        };
        lastConsultaKeyRef.current = initial.ruc.length === 11 ? initial.ruc : null;
        remember(initial);
        form.setData(initial);
        form.clearErrors();
        setOpen(true);
    };

    const onConsultarRuc = async (forcedRuc?: string) => {
        const numero = soloDigitosDocumento(forcedRuc ?? form.data.ruc, 11);
        if (numero.length !== 11) {
            return;
        }

        lastConsultaKeyRef.current = numero;
        setConsultando(true);

        try {
            const response = await fetch(`/taller/aseguradoras/consulta-ruc?ruc=${encodeURIComponent(numero)}`, {
                method: 'GET',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            const body = (await response.json()) as ConsultaRuc;

            if (!response.ok || !body.success || !body.data) {
                const title =
                    response.status === 429 || body.code === 'rate_limit'
                        ? 'Demasiadas consultas, intenta de nuevo en un momento.'
                        : (body.message ?? 'No se pudo consultar el RUC.');
                toastManager.error({ title });

                return;
            }

            const razon = typeof body.data.razon_social === 'string' ? body.data.razon_social.trim() : '';
            form.setData((prev) => ({
                ...prev,
                ruc: body.data?.ruc ?? numero,
                nombre: razon !== '' ? razon : prev.nombre,
            }));
        } catch {
            toastManager.error({ title: 'No se pudo consultar el RUC.' });
        } finally {
            setConsultando(false);
        }
    };

    useEffect(() => {
        if (!open || !rucCompleto || consultando || form.processing) {
            return;
        }

        if (lastConsultaKeyRef.current === ruc) {
            return;
        }

        void onConsultarRuc(ruc);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, ruc, rucCompleto, consultando, form.processing]);

    const submit = () => {
        const opts = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) {
            form.put(`/taller/aseguradoras/${editing.id}`, opts);
            return;
        }
        form.post('/taller/aseguradoras', opts);
    };

    const columns: DataTableColumn<Aseguradora>[] = [
        {
            key: 'nombre',
            header: 'Aseguradora',
            cell: (row) => <span className="font-medium">{row.nombre}</span>,
        },
        { key: 'ruc', header: 'RUC', cell: (row) => row.ruc ?? '—' },
        { key: 'telefono', header: 'Teléfono', cell: (row) => row.telefono ?? '—' },
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
                    {row.activo ? 'Activa' : 'Inactiva'}
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
                    <AseguradoraRowActions
                        nombre={row.nombre}
                        onEdit={() => openEdit(row)}
                        onDelete={() =>
                            router.delete(`/taller/aseguradoras/${row.id}`, { preserveScroll: true })
                        }
                    />
                </div>
            ),
        },
    ];

    const estadoOptions: FilterChip[] = [
        { value: 'todos', label: 'Todas' },
        { value: 'activos', label: 'Activas' },
        { value: 'inactivos', label: 'Inactivas' },
    ];

    const canCreate = form.data.nombre.trim() !== '';

    return (
        <>
            <Head title="Aseguradoras" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Aseguradoras"
                    description="Compañías con las que el taller atiende siniestros."
                    stats={[
                        { label: 'Total', value: stats.total, variant: 'info', icon: Shield },
                        { label: 'Activas', value: stats.activos, variant: 'primary', icon: Shield },
                        { label: 'Coincidencias', value: stats.coincidencias, variant: 'primary', icon: Shield },
                    ]}
                    action={
                        <Can permission="aseguradoras.create">
                            <Button type="button" className="cursor-pointer gap-2" onClick={openCreate}>
                                <Plus className="size-4" />
                                Nueva aseguradora
                            </Button>
                        </Can>
                    }
                />
                <DataTable
                    columns={columns}
                    data={aseguradoras.data}
                    rowKey={(row) => row.id}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={(value) => {
                                setSearch(value);
                                router.get(
                                    '/taller/aseguradoras',
                                    { search: value, estado: filters.estado },
                                    { preserveState: true, replace: true },
                                );
                            }}
                            placeholder="Buscar por nombre o RUC"
                        >
                            <FilterChips
                                ariaLabel="Filtrar aseguradoras"
                                value={filters.estado}
                                onChange={(estado) =>
                                    router.get(
                                        '/taller/aseguradoras',
                                        { search, estado },
                                        { preserveState: true },
                                    )
                                }
                                options={estadoOptions}
                            />
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={aseguradoras}
                            preservedQuery={{
                                search: filters.search || undefined,
                                estado: filters.estado !== 'todos' ? filters.estado : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Shield}
                            title="No hay aseguradoras"
                            description="Registra la primera compañía de seguros."
                        />
                    }
                />
            </div>

            <FormModal
                open={open}
                onOpenChange={requestClose}
                title={editing ? 'Editar aseguradora' : 'Nueva aseguradora'}
                description="Al completar el RUC se consulta SUNAT y se completa el nombre."
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
                <div className="flex flex-col gap-5">
                <FormSection index={0} title="RUC" icon={Shield} columns={1}>
                    <FormField id="aseg-ruc" label="RUC" error={form.errors.ruc}>
                        <DocumentNumberLookupField
                            id="aseg-ruc"
                            value={form.data.ruc}
                            onChange={(next) => form.setData('ruc', next)}
                            maxLength={11}
                            consulting={consultando}
                            disabled={form.processing}
                            invalid={Boolean(form.errors.ruc)}
                            onConsult={() => void onConsultarRuc()}
                            consultAriaLabel="Consultar RUC en SUNAT"
                            placeholder="20123456789"
                        />
                    </FormField>
                </FormSection>
                <FormSection index={1} title="Datos" columns={1}>
                    <FormField id="aseg-nombre" label="Nombre" required error={form.errors.nombre}>
                        <Input
                            id="aseg-nombre"
                            value={form.data.nombre}
                            onChange={(event) => form.setData('nombre', event.target.value)}
                        />
                    </FormField>
                    <FormField id="aseg-telefono" label="Teléfono" error={form.errors.telefono}>
                        <Input
                            id="aseg-telefono"
                            value={form.data.telefono}
                            onChange={(event) => form.setData('telefono', event.target.value)}
                        />
                    </FormField>
                    <FormField id="aseg-email" label="Correo" error={form.errors.email}>
                        <Input
                            id="aseg-email"
                            type="email"
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                        />
                    </FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={form.data.activo}
                            onCheckedChange={(checked) => form.setData('activo', checked === true)}
                        />
                        Activa
                    </label>
                </FormSection>
                </div>
            </FormModal>
        </>
    );
}
