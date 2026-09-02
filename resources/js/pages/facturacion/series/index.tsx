import { Head, router, useForm } from '@inertiajs/react';
import { Hash, Loader2, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { DataTable, EmptyState, PageHeader } from '@/components/data-page';
import type { DataTableColumn } from '@/components/data-page';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/use-permission';
import seriesRoutes from '@/routes/facturacion/series';

type SedeOption = {
    id: string;
    nombre: string;
    codigo: string;
};

type FelSerieRow = {
    id: string;
    sede_id: string;
    sede: SedeOption | null;
    tipo_comprobante: number;
    tipo_label: string;
    serie: string;
    ultimo_correlativo: number;
    activo: boolean;
    tiene_documentos: boolean;
};

type FormData = {
    sede_id: string;
    tipo_comprobante: string;
    serie: string;
};

export default function Index({
    series,
    sedes,
}: {
    series: readonly FelSerieRow[];
    sedes: readonly SedeOption[];
}) {
    const { can } = usePermission();
    const canCreate = can('series.create');
    const canUpdate = can('series.update');
    const canDelete = can('series.delete');
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<FormData>({
        sede_id: '',
        tipo_comprobante: '2',
        serie: 'B001',
    });

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        post(seriesRoutes.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    };

    const columns: DataTableColumn<FelSerieRow>[] = [
        {
            key: 'sede',
            header: 'Sede',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm">{row.sede?.nombre ?? '—'}</span>
                    <span className="font-mono text-xs text-muted-foreground">{row.sede?.codigo}</span>
                </div>
            ),
        },
        {
            key: 'tipo',
            header: 'Tipo',
            cell: (row) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.tipo_comprobante === 1
                            ? 'bg-sky-50 text-sky-800'
                            : 'bg-emerald-50 text-emerald-800'
                    }`}
                >
                    {row.tipo_label}
                </span>
            ),
        },
        {
            key: 'serie',
            header: 'Serie',
            cell: (row) => <span className="font-mono text-sm font-medium">{row.serie}</span>,
        },
        {
            key: 'correlativo',
            header: 'Último n.º',
            cell: (row) => (
                <span className="tabular-nums text-sm">{String(row.ultimo_correlativo).padStart(8, '0')}</span>
            ),
        },
        {
            key: 'estado',
            header: 'Estado',
            cell: (row) => (
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}
                >
                    {row.activo ? 'Activa' : 'Inactiva'}
                </span>
            ),
        },
        {
            key: 'acciones',
            header: <span className="md:sr-only">Acciones</span>,
            align: 'right',
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    {canUpdate && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                            aria-label={row.activo ? 'Desactivar serie' : 'Activar serie'}
                            onClick={() =>
                                router.patch(
                                    seriesRoutes.update(row.id).url,
                                    { activo: !row.activo },
                                    { preserveScroll: true },
                                )
                            }
                        >
                            {row.activo ? (
                                <PowerOff className="size-4" />
                            ) : (
                                <Power className="size-4" />
                            )}
                        </Button>
                    )}
                    {canDelete && !row.tiene_documentos && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer text-destructive"
                            aria-label="Eliminar serie"
                            onClick={() =>
                                router.delete(seriesRoutes.destroy(row.id).url, { preserveScroll: true })
                            }
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
            className: 'w-24',
        },
    ];

    return (
        <>
            <Head title="Series SUNAT" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Series"
                    description="Una serie de boleta (B001) y factura (F001) por sede. Se crean solas al abrir una sede o al emitir."
                    stats={[{ label: 'Series', value: series.length, variant: 'info', icon: Hash }]}
                    action={
                        canCreate ? (
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => {
                                    clearErrors();
                                    setData({
                                        sede_id: sedes[0]?.id ?? '',
                                        tipo_comprobante: '2',
                                        serie: 'B001',
                                    });
                                    setOpen(true);
                                }}
                            >
                                <Plus className="size-4" />
                                Nueva serie
                            </Button>
                        ) : undefined
                    }
                />

                <DataTable
                    columns={columns}
                    data={[...series]}
                    rowKey={(row) => row.id}
                    emptyState={
                        <EmptyState
                            icon={Hash}
                            title="Sin series"
                            description="Crea una sede o agrega B001 / F001 para empezar a emitir."
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer"
                                        onClick={() => setOpen(true)}
                                    >
                                        Nueva serie
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <FormModal
                open={open}
                onOpenChange={setOpen}
                title="Nueva serie"
                description="Cuatro caracteres. Boletas suelen ser B001; facturas F001."
                onSubmit={onSubmit}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
                            {processing && <Loader2 className="size-4 animate-spin" />}
                            Crear
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <FormField id="serie-sede" label="Sede" error={errors.sede_id}>
                        <Select value={data.sede_id} onValueChange={(value) => setData('sede_id', value)}>
                            <SelectTrigger id="serie-sede">
                                <SelectValue placeholder="Elige una sede" />
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
                    <FormField id="serie-tipo" label="Tipo" error={errors.tipo_comprobante}>
                        <Select
                            value={data.tipo_comprobante}
                            onValueChange={(value) => {
                                setData('tipo_comprobante', value);
                                setData('serie', value === '1' ? 'F001' : 'B001');
                            }}
                        >
                            <SelectTrigger id="serie-tipo">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2">Boleta de venta</SelectItem>
                                <SelectItem value="1">Factura</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="serie-codigo" label="Serie" error={errors.serie}>
                        <Input
                            id="serie-codigo"
                            value={data.serie}
                            maxLength={4}
                            onChange={(e) => setData('serie', e.target.value.toUpperCase())}
                            placeholder="B001"
                        />
                    </FormField>
                </div>
            </FormModal>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Facturación' }, { title: 'Series', href: '/facturacion/series' }],
};
