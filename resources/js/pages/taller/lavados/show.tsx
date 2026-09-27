import { Head, Link, router, useForm } from '@inertiajs/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Can } from '@/components/can';
import { FormField } from '@/components/forms';
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
import { LavadoCobroModal } from './components/lavado-cobro-modal';

type Linea = {
    servicio_id: string;
    descripcion: string;
    cantidad: string;
    precio_unitario: string;
};

type ServicioOption = { id: string; nombre: string; precio: string | number };

type Props = {
    lavado: {
        id: string;
        numero: string;
        placa: string;
        estado: 'abierto' | 'cobrado' | 'anulado';
        notas: string | null;
        sede: string | null;
        cliente: string | null;
        vehiculo: string | null;
        venta: { id: string; numero: string } | null;
        lineas: {
            id: string;
            servicio_id: string | null;
            descripcion: string;
            cantidad: string;
            precio_unitario: string;
        }[];
    };
    mi_sesion_abierta: { id: string; sede_id: string } | null;
    igv: { igv_porcentaje: number; precio_incluye_igv: boolean; moneda: string };
    fel_ready: boolean;
    servicios: ServicioOption[];
};

const money = (value: number): string =>
    value.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

const emptyLine = (): Linea => ({
    servicio_id: '',
    descripcion: '',
    cantidad: '1',
    precio_unitario: '',
});

export default function Show({ lavado, mi_sesion_abierta, igv, fel_ready, servicios }: Props) {
    const abierto = lavado.estado === 'abierto';
    const [cobroOpen, setCobroOpen] = useState(false);
    const form = useForm<{ lineas: Linea[] }>({
        lineas:
            lavado.lineas.length > 0
                ? lavado.lineas.map((linea) => ({
                      servicio_id: linea.servicio_id ?? '',
                      descripcion: linea.descripcion,
                      cantidad: String(linea.cantidad),
                      precio_unitario: String(linea.precio_unitario),
                  }))
                : [emptyLine()],
    });

    const total = useMemo(
        () =>
            form.data.lineas.reduce(
                (sum, linea) => sum + (Number(linea.cantidad) || 0) * (Number(linea.precio_unitario) || 0),
                0,
            ),
        [form.data.lineas],
    );

    const setLinea = (index: number, patch: Partial<Linea>) => {
        form.setData(
            'lineas',
            form.data.lineas.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
        );
    };

    return (
        <>
            <Head title={`${lavado.numero} · Car wash`} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <Link href="/taller/lavados" className="text-xs text-muted-foreground hover:underline">
                            Volver a car wash
                        </Link>
                        <h1 className="mt-1 font-mono text-xl font-semibold">{lavado.numero}</h1>
                        <p className="text-sm text-muted-foreground">
                            {lavado.cliente} · {lavado.placa}
                            {lavado.sede ? ` · ${lavado.sede}` : ''}
                        </p>
                    </div>
                    <Badge variant={lavado.estado === 'cobrado' ? 'default' : 'secondary'}>
                        {lavado.estado === 'abierto' ? 'Abierto' : lavado.estado === 'cobrado' ? 'Cobrado' : 'Anulado'}
                    </Badge>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <section className="rounded-xl border bg-card p-4">
                        <h2 className="text-sm font-semibold">Cargos</h2>
                        <p className="mb-4 text-xs text-muted-foreground">
                            Servicios del lavado. La precuenta se cobra en caja.
                        </p>
                        <div className="flex flex-col gap-3">
                            {form.data.lineas.map((linea, index) => (
                                <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_7rem_7rem_auto]">
                                    <FormField id={`cw-srv-${index}`} label="Servicio">
                                        <Select
                                            value={linea.servicio_id || '__libre__'}
                                            onValueChange={(value) => {
                                                const servicio = servicios.find((item) => item.id === value);
                                                setLinea(index, {
                                                    servicio_id: value === '__libre__' ? '' : value,
                                                    descripcion: servicio?.nombre ?? linea.descripcion,
                                                    precio_unitario: servicio
                                                        ? String(servicio.precio)
                                                        : linea.precio_unitario,
                                                });
                                            }}
                                            disabled={!abierto}
                                        >
                                            <SelectTrigger id={`cw-srv-${index}`}>
                                                <SelectValue placeholder="Texto libre" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__libre__">Texto libre</SelectItem>
                                                {servicios.map((servicio) => (
                                                    <SelectItem key={servicio.id} value={servicio.id}>
                                                        {servicio.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormField>
                                    <Input
                                        value={linea.descripcion}
                                        placeholder="Descripción"
                                        disabled={!abierto}
                                        onChange={(event) => setLinea(index, { descripcion: event.target.value })}
                                    />
                                    <Input
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={linea.cantidad}
                                        disabled={!abierto}
                                        onChange={(event) => setLinea(index, { cantidad: event.target.value })}
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={linea.precio_unitario}
                                            disabled={!abierto}
                                            onChange={(event) =>
                                                setLinea(index, { precio_unitario: event.target.value })
                                            }
                                        />
                                        {abierto ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    form.setData(
                                                        'lineas',
                                                        form.data.lineas.filter((_, i) => i !== index),
                                                    )
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {abierto ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => form.setData('lineas', [...form.data.lineas, emptyLine()])}
                                >
                                    <Plus className="size-3.5" />
                                    Agregar cargo
                                </Button>
                                <Can permission="lavados.update">
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={form.processing}
                                        onClick={() =>
                                            form.put(`/taller/lavados/${lavado.id}/cargos`, { preserveScroll: true })
                                        }
                                    >
                                        {form.processing ? <Loader2 className="size-4 animate-spin" /> : 'Guardar cargos'}
                                    </Button>
                                </Can>
                            </div>
                        ) : null}
                        {form.errors.lineas ? (
                            <p className="mt-2 text-sm text-destructive">{form.errors.lineas}</p>
                        ) : null}
                    </section>

                    <aside className="flex h-fit flex-col gap-3 rounded-xl border bg-card p-4">
                        <h2 className="text-sm font-semibold">Precuenta</h2>
                        <p className="text-2xl font-semibold tabular-nums">{money(total)}</p>
                        <p className="text-xs text-muted-foreground">
                            {igv.precio_incluye_igv
                                ? `Precios con IGV ${igv.igv_porcentaje}%`
                                : `IGV ${igv.igv_porcentaje}% se suma al cobrar`}
                        </p>
                        {lavado.venta ? (
                            <Button type="button" asChild>
                                <Link href={`/caja/ventas/${lavado.venta.id}`}>Ver venta {lavado.venta.numero}</Link>
                            </Button>
                        ) : null}
                        {abierto ? (
                            <Can permission="ventas.create">
                                <Button type="button" disabled={total <= 0} onClick={() => setCobroOpen(true)}>
                                    Cobrar
                                </Button>
                            </Can>
                        ) : null}
                        {abierto ? (
                            <Can permission="lavados.delete">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.post(`/taller/lavados/${lavado.id}/anular`)}
                                >
                                    Anular
                                </Button>
                            </Can>
                        ) : null}
                    </aside>
                </div>
            </div>

            <LavadoCobroModal
                open={cobroOpen}
                onOpenChange={setCobroOpen}
                lavadoId={lavado.id}
                lineas={form.data.lineas}
                total={total}
                sesionAbierta={mi_sesion_abierta !== null}
                felReady={fel_ready}
            />
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        { title: 'Taller' },
        { title: 'Car wash', href: '/taller/lavados' },
        { title: 'Precuenta' },
    ],
};
