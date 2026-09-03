import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Loader2, Plus, Receipt, Trash2, Wallet } from 'lucide-react';
import { useMemo, type FormEvent } from 'react';
import { FormField, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { expandServicioConKit, spliceLinesAtIndex } from '@/lib/servicio-kit';
import { cn } from '@/lib/utils';
import ventas from '@/routes/caja/ventas';

type MiSesionAbierta = {
    id: string;
    sede_id: string;
    opened_at: string;
    saldo_apertura: string | number;
} | null;

type IgvConfig = {
    igv_porcentaje: string | number;
    precio_incluye_igv: boolean;
    moneda: string;
};

type ClienteOption = {
    id: string;
    nombre: string;
};

type VehiculoOption = {
    id: string;
    cliente_id: string;
    label: string;
};

type ProductoOption = {
    id: string;
    nombre: string;
    sku: string | null;
    precio_venta: string | number | null;
    unidad: string;
};

type ServicioKitItem = {
    producto_id: string;
    nombre: string;
    cantidad: string | number;
    precio_venta: string | number | null;
    unidad: string;
};

type ServicioOption = {
    id: string;
    nombre: string;
    precio: string | number | null;
    kit?: readonly ServicioKitItem[];
};

type LineaForm = {
    servicio_id: string;
    producto_id: string;
    concepto: string;
    cantidad: string;
    precio_unitario: string;
};

type PagoForm = {
    metodo: string;
    monto: string;
    monto_recibido: string;
};

type FormData = {
    cliente_id: string;
    vehiculo_id: string;
    lineas: LineaForm[];
    pagos: PagoForm[];
    notas: string;
    tipo_comprobante_sunat: string;
    caja_sesion_id: string;
};

type CreateProps = {
    mi_sesion_abierta: MiSesionAbierta;
    igv: IgvConfig;
    fel_ready: boolean;
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    productos: readonly ProductoOption[];
    servicios: readonly ServicioOption[];
};

const LIBRE = '__libre__';

const METODOS = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'yape', label: 'Yape' },
    { value: 'plin', label: 'Plin' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'transferencia', label: 'Transferencia' },
];

const emptyLinea = (): LineaForm => ({
    servicio_id: '',
    producto_id: '',
    concepto: '',
    cantidad: '1',
    precio_unitario: '',
});

const money = (value: number): string =>
    value.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export default function Create({
    mi_sesion_abierta,
    igv,
    fel_ready = false,
    clientes = [],
    vehiculos = [],
    productos = [],
    servicios = [],
}: CreateProps) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        cliente_id: '',
        vehiculo_id: '',
        lineas: [emptyLinea()],
        pagos: [{ metodo: 'efectivo', monto: '', monto_recibido: '' }],
        notas: '',
        tipo_comprobante_sunat: '0',
        caja_sesion_id: mi_sesion_abierta?.id ?? '',
    });

    const clienteOptions = useMemo(
        () => clientes.map((c) => ({ value: c.id, label: c.nombre })),
        [clientes],
    );

    const vehiculosFiltrados = useMemo(
        () =>
            data.cliente_id
                ? vehiculos.filter((v) => v.cliente_id === data.cliente_id)
                : [],
        [vehiculos, data.cliente_id],
    );

    const vehiculoOptions = useMemo(
        () => vehiculosFiltrados.map((v) => ({ value: v.id, label: v.label })),
        [vehiculosFiltrados],
    );

    const totales = useMemo(() => {
        const suma = data.lineas.reduce((acc, linea) => {
            const qty = Number(linea.cantidad) || 0;
            const pu = Number(linea.precio_unitario) || 0;

            return acc + qty * pu;
        }, 0);
        const igvPct = Number(igv.igv_porcentaje) || 0;

        if (igv.precio_incluye_igv) {
            const divisor = 1 + igvPct / 100;
            const total = suma;
            const igvMonto = divisor > 0 ? total - total / divisor : 0;

            return {
                subtotal: total - igvMonto,
                igv: igvMonto,
                total,
            };
        }

        const subtotal = suma;
        const igvMonto = subtotal * (igvPct / 100);

        return {
            subtotal,
            igv: igvMonto,
            total: subtotal + igvMonto,
        };
    }, [data.lineas, igv]);

    const canSubmit = Boolean(mi_sesion_abierta) && !processing;

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!mi_sesion_abierta) {
            return;
        }

        post('/caja/ventas', { preserveScroll: true });
    };

    const setLinea = (index: number, patch: Partial<LineaForm>) => {
        setData(
            'lineas',
            data.lineas.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
        );
    };

    const setPago = (index: number, patch: Partial<PagoForm>) => {
        setData(
            'pagos',
            data.pagos.map((pago, i) => (i === index ? { ...pago, ...patch } : pago)),
        );
    };

    return (
        <>
            <Head title="Nueva venta" />

            <div className="flex flex-1 flex-col gap-5 p-4 pb-28 sm:p-6">
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 size-11 shrink-0 cursor-pointer"
                        asChild
                    >
                        <Link href={ventas.index().url} aria-label="Volver a ventas">
                            <ArrowLeft className="size-5" strokeWidth={2.25} />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Receipt className="size-5 shrink-0 text-brand-600" strokeWidth={2} />
                            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                                Nueva venta
                            </h1>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Venta de mostrador: aceite, repuestos o servicios sin orden de trabajo.
                        </p>
                    </div>
                </div>

                {!mi_sesion_abierta && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        No tienes una caja abierta.{' '}
                        <Link href="/caja/sesiones" className="font-medium underline">
                            Abrir caja
                        </Link>{' '}
                        para poder cobrar.
                    </p>
                )}

                <form id="venta-directa-form" onSubmit={onSubmit} className="flex flex-col gap-5">
                    <FormSection index={0} title="Cliente" columns={2}>
                        <FormField
                            id="venta-cliente"
                            label="Cliente (opcional)"
                            error={errors.cliente_id}
                            className="min-w-0"
                        >
                            <Combobox
                                id="venta-cliente"
                                options={clienteOptions}
                                value={data.cliente_id || null}
                                onChange={(value) => {
                                    setData('cliente_id', value ?? '');
                                    setData('vehiculo_id', '');
                                }}
                                placeholder="Sin cliente"
                                searchPlaceholder="Buscar cliente…"
                                emptyMessage="Sin coincidencias."
                                clearable
                            />
                        </FormField>

                        <FormField
                            id="venta-vehiculo"
                            label="Vehículo (opcional)"
                            error={errors.vehiculo_id}
                            className="min-w-0"
                        >
                            <Combobox
                                id="venta-vehiculo"
                                options={vehiculoOptions}
                                value={data.vehiculo_id || null}
                                onChange={(value) => setData('vehiculo_id', value ?? '')}
                                placeholder={
                                    data.cliente_id
                                        ? 'Sin vehículo'
                                        : 'Primero el cliente'
                                }
                                searchPlaceholder="Placa o modelo…"
                                emptyMessage={
                                    data.cliente_id
                                        ? 'Este cliente no tiene vehículos.'
                                        : 'Selecciona un cliente primero.'
                                }
                                clearable
                                disabled={!data.cliente_id}
                            />
                        </FormField>
                    </FormSection>

                    <FormSection index={1} title="Líneas" columns={1}>
                        {data.lineas.map((linea, index) => (
                            <div key={index} className="grid gap-2">
                                {(servicios.length > 0 || productos.length > 0) && (
                                    <FormField
                                        id={`linea-catalogo-${index}`}
                                        label={index === 0 ? 'Servicio o repuesto' : ''}
                                        error={
                                            errors[`lineas.${index}.producto_id`] ||
                                            errors[`lineas.${index}.servicio_id`]
                                        }
                                    >
                                        <Select
                                            value={
                                                linea.servicio_id
                                                    ? `s:${linea.servicio_id}`
                                                    : linea.producto_id
                                                      ? `p:${linea.producto_id}`
                                                      : LIBRE
                                            }
                                            onValueChange={(value) => {
                                                if (value === LIBRE) {
                                                    setLinea(index, {
                                                        servicio_id: '',
                                                        producto_id: '',
                                                    });

                                                    return;
                                                }

                                                if (value.startsWith('s:')) {
                                                    const id = value.slice(2);
                                                    const servicio = servicios.find(
                                                        (item) => item.id === id,
                                                    );
                                                    const expanded = expandServicioConKit({
                                                        servicioId: id,
                                                        servicioNombre:
                                                            servicio?.nombre ?? linea.concepto,
                                                        servicioPrecio: servicio?.precio,
                                                        kit: servicio?.kit,
                                                        cantidadServicio: linea.cantidad || '1',
                                                        buildServicioLine: ({
                                                            servicio_id,
                                                            producto_id,
                                                            cantidad,
                                                            precio_unitario,
                                                            label,
                                                        }) => ({
                                                            servicio_id,
                                                            producto_id,
                                                            concepto: label,
                                                            cantidad,
                                                            precio_unitario:
                                                                precio_unitario ||
                                                                linea.precio_unitario ||
                                                                '',
                                                        }),
                                                        buildProductoLine: ({
                                                            servicio_id,
                                                            producto_id,
                                                            cantidad,
                                                            precio_unitario,
                                                            label,
                                                        }) => ({
                                                            servicio_id,
                                                            producto_id,
                                                            concepto: label,
                                                            cantidad,
                                                            precio_unitario,
                                                        }),
                                                    });

                                                    setData(
                                                        'lineas',
                                                        spliceLinesAtIndex(
                                                            data.lineas,
                                                            index,
                                                            expanded,
                                                        ),
                                                    );

                                                    return;
                                                }

                                                const id = value.slice(2);
                                                const producto = productos.find(
                                                    (item) => item.id === id,
                                                );
                                                setLinea(index, {
                                                    servicio_id: '',
                                                    producto_id: id,
                                                    concepto:
                                                        producto?.nombre ?? linea.concepto,
                                                    precio_unitario:
                                                        producto?.precio_venta != null
                                                            ? String(producto.precio_venta)
                                                            : linea.precio_unitario,
                                                });
                                            }}
                                        >
                                            <SelectTrigger id={`linea-catalogo-${index}`}>
                                                <SelectValue placeholder="Texto libre" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={LIBRE}>Texto libre</SelectItem>
                                                {servicios.map((servicio) => (
                                                    <SelectItem
                                                        key={`s-${servicio.id}`}
                                                        value={`s:${servicio.id}`}
                                                    >
                                                        Servicio · {servicio.nombre}
                                                    </SelectItem>
                                                ))}
                                                {productos.map((producto) => (
                                                    <SelectItem
                                                        key={`p-${producto.id}`}
                                                        value={`p:${producto.id}`}
                                                    >
                                                        Repuesto · {producto.nombre}
                                                        {producto.sku ? ` · ${producto.sku}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormField>
                                )}
                                <div className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
                                    <FormField
                                        id={`linea-concepto-${index}`}
                                        label={index === 0 ? 'Concepto' : ''}
                                        error={errors[`lineas.${index}.concepto`]}
                                    >
                                        <Input
                                            id={`linea-concepto-${index}`}
                                            value={linea.concepto}
                                            onChange={(e) =>
                                                setLinea(index, { concepto: e.target.value })
                                            }
                                            placeholder="Aceite / filtro / servicio"
                                        />
                                    </FormField>
                                    <FormField
                                        id={`linea-qty-${index}`}
                                        label={index === 0 ? 'Cant.' : ''}
                                        error={errors[`lineas.${index}.cantidad`]}
                                    >
                                        <Input
                                            id={`linea-qty-${index}`}
                                            type="number"
                                            min="0.001"
                                            step="0.001"
                                            value={linea.cantidad}
                                            onChange={(e) =>
                                                setLinea(index, { cantidad: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        id={`linea-pu-${index}`}
                                        label={index === 0 ? 'P. unitario' : ''}
                                        error={errors[`lineas.${index}.precio_unitario`]}
                                    >
                                        <Input
                                            id={`linea-pu-${index}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={linea.precio_unitario}
                                            onChange={(e) =>
                                                setLinea(index, {
                                                    precio_unitario: e.target.value,
                                                })
                                            }
                                        />
                                    </FormField>
                                    {data.lineas.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="mt-6 cursor-pointer"
                                            onClick={() =>
                                                setData(
                                                    'lineas',
                                                    data.lineas.filter((_, i) => i !== index),
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5 self-start"
                            onClick={() => setData('lineas', [...data.lineas, emptyLinea()])}
                        >
                            <Plus className="size-3.5" />
                            Agregar línea
                        </Button>
                        {errors.lineas && (
                            <p className="text-sm text-destructive">{errors.lineas}</p>
                        )}
                    </FormSection>

                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="tabular-nums">{money(totales.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>IGV {igv.igv_porcentaje}%</span>
                            <span className="tabular-nums">{money(totales.igv)}</span>
                        </div>
                        <div className="mt-1 flex justify-between font-medium">
                            <span>Total</span>
                            <span className="tabular-nums">{money(totales.total)}</span>
                        </div>
                    </div>

                    <FormSection index={2} title="Pago" columns={1}>
                        {data.pagos.map((pago, index) => (
                            <div
                                key={index}
                                className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr]"
                            >
                                <FormField
                                    id={`pago-metodo-${index}`}
                                    label={index === 0 ? 'Método' : ''}
                                    error={errors[`pagos.${index}.metodo`]}
                                >
                                    <Select
                                        value={pago.metodo}
                                        onValueChange={(value) =>
                                            setPago(index, { metodo: value })
                                        }
                                    >
                                        <SelectTrigger id={`pago-metodo-${index}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {METODOS.map((metodo) => (
                                                <SelectItem
                                                    key={metodo.value}
                                                    value={metodo.value}
                                                >
                                                    {metodo.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <FormField
                                    id={`pago-monto-${index}`}
                                    label={index === 0 ? 'Monto' : ''}
                                    error={errors[`pagos.${index}.monto`]}
                                >
                                    <Input
                                        id={`pago-monto-${index}`}
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={pago.monto}
                                        onChange={(e) =>
                                            setPago(index, { monto: e.target.value })
                                        }
                                        placeholder={money(totales.total)}
                                    />
                                </FormField>
                                {pago.metodo === 'efectivo' && (
                                    <FormField
                                        id={`pago-recibido-${index}`}
                                        label={index === 0 ? 'Recibido' : ''}
                                        error={errors[`pagos.${index}.monto_recibido`]}
                                    >
                                        <Input
                                            id={`pago-recibido-${index}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={pago.monto_recibido}
                                            onChange={(e) =>
                                                setPago(index, {
                                                    monto_recibido: e.target.value,
                                                })
                                            }
                                        />
                                    </FormField>
                                )}
                            </div>
                        ))}
                        {errors.pagos && (
                            <p className="text-sm text-destructive">{errors.pagos}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            La suma de los pagos debe coincidir con el total.
                        </p>
                    </FormSection>

                    <FormSection index={3} title="Comprobante" columns={1}>
                        <FormField
                            id="tipo-comprobante"
                            label="Tipo"
                            error={errors.tipo_comprobante_sunat}
                        >
                            <Select
                                value={data.tipo_comprobante_sunat}
                                onValueChange={(value) =>
                                    setData('tipo_comprobante_sunat', value)
                                }
                            >
                                <SelectTrigger id="tipo-comprobante">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">
                                        Ticket interno (sin SUNAT)
                                    </SelectItem>
                                    <SelectItem value="2">Boleta de venta</SelectItem>
                                    <SelectItem value="1">Factura</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>
                        {data.tipo_comprobante_sunat !== '0' && !fel_ready && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                APISUNAT no está configurado. El cobro se registra igual; podrás
                                emitir el comprobante cuando guardes el token.
                            </p>
                        )}
                    </FormSection>

                    <FormField id="venta-notas" label="Notas" error={errors.notas}>
                        <Textarea
                            id="venta-notas"
                            value={data.notas}
                            onChange={(e) => setData('notas', e.target.value)}
                            rows={2}
                        />
                    </FormField>
                </form>
            </div>

            <div
                className={cn(
                    'fixed right-2 bottom-2 z-40 w-[calc(100%-1rem)] max-w-xl rounded-xl border border-border/70 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md',
                    'md:w-[calc(100vw-var(--sidebar-width,16rem)-2rem)]',
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Wallet
                                className="size-4 shrink-0 text-brand-600/80"
                                strokeWidth={2.25}
                            />
                            <span className="truncate">Total a cobrar</span>
                        </div>
                        <span className="text-base font-semibold tabular-nums">
                            {money(totales.total)}
                        </span>
                    </div>
                    <Button
                        type="submit"
                        form="venta-directa-form"
                        disabled={!canSubmit}
                        className="h-10 shrink-0 cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Cobrar
                    </Button>
                </div>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: 'Caja' },
        { title: 'Ventas', href: '/caja/ventas' },
        { title: 'Nueva venta' },
    ],
};
