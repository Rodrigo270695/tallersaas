import { Link, useForm } from '@inertiajs/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo  } from 'react';
import type {FormEvent} from 'react';
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
import { expandServicioConKit, spliceLinesAtIndex } from '@/lib/servicio-kit';
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import type {
    MiSesionAbierta,
    OrdenIgv,
    OrdenTrabajo,
    ProductoCobroOption,
    ServicioCobroOption,
} from '../types';

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
    lineas: LineaForm[];
    pagos: PagoForm[];
    notas: string;
    tipo_comprobante_sunat: string;
};

const LIBRE = '__libre__';

const METODOS = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'yape', label: 'Yape' },
    { value: 'plin', label: 'Plin' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'transferencia', label: 'Transferencia' },
];

const money = (value: number): string =>
    value.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export function OrdenCobroModal({
    open,
    onOpenChange,
    orden,
    sesion,
    igv,
    productos = [],
    servicios = [],
    felReady = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orden: OrdenTrabajo | null;
    sesion: MiSesionAbierta;
    igv: OrdenIgv;
    productos?: readonly ProductoCobroOption[];
    servicios?: readonly ServicioCobroOption[];
    felReady?: boolean;
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            lineas: [{ servicio_id: '', producto_id: '', concepto: '', cantidad: '1', precio_unitario: '' }],
            pagos: [{ metodo: 'efectivo', monto: '', monto_recibido: '' }],
            notas: '',
            tipo_comprobante_sunat: '0',
        });

    useEffect(() => {
        if (!open || !orden) {
            return;
        }

        clearErrors();
        reset();
        const fromOt = (orden.lineas ?? []).filter((linea) => linea.descripcion?.trim());
        const lineas =
            fromOt.length > 0
                ? fromOt.map((linea) => ({
                      servicio_id: linea.servicio_id ?? '',
                      producto_id: linea.producto_id ?? '',
                      concepto: linea.descripcion,
                      cantidad: String(linea.cantidad ?? 1),
                      precio_unitario: String(linea.precio_unitario ?? ''),
                  }))
                : [
                      {
                          servicio_id: '',
                          producto_id: '',
                          concepto: orden.solicitud_cliente?.trim() || `OT ${orden.numero}`,
                          cantidad: '1',
                          precio_unitario:
                              Number(orden.saldo ?? orden.total ?? 0) > 0
                                  ? String(orden.saldo ?? orden.total)
                                  : '',
                      },
                  ];
        setData({
            lineas,
            pagos: [{ metodo: 'efectivo', monto: '', monto_recibido: '' }],
            notas: '',
            tipo_comprobante_sunat: '0',
        });
    }, [open, orden, clearErrors, reset, setData]);

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

    const sedeMismatch =
        sesion !== null && orden !== null && sesion.sede_id !== orden.sede_id;

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!orden) {
            return;
        }

        post(ordenesTrabajo.cobrar(orden.id).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
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
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={orden ? `Pasar a venta · ${orden.numero}` : 'Pasar a venta'}
            description="Confirma la precuenta y registra el cobro en caja. La OT acumula cargos; Ventas cierra la venta."
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !sesion || sedeMismatch || !orden}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Confirmar venta
                    </Button>
                </>
            }
        >
            {!sesion && (
                <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    No tienes una caja abierta.{' '}
                    <Link href="/caja/sesiones" className="font-medium underline">
                        Abrir caja
                    </Link>
                </p>
            )}

            {sedeMismatch && (
                <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                    La caja abierta no es de la sede de esta orden.
                </p>
            )}

            <div className="flex flex-col gap-5">
                <FormSection index={0} title="Líneas" columns={1}>
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
                                                const servicio = servicios.find((item) => item.id === id);
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
                                                    spliceLinesAtIndex(data.lineas, index, expanded),
                                                );

                                                return;
                                            }

                                            const id = value.slice(2);
                                            const producto = productos.find((item) => item.id === id);
                                            setLinea(index, {
                                                servicio_id: '',
                                                producto_id: id,
                                                concepto: producto?.nombre ?? linea.concepto,
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
                                                <SelectItem key={`s-${servicio.id}`} value={`s:${servicio.id}`}>
                                                    Servicio · {servicio.nombre}
                                                </SelectItem>
                                            ))}
                                            {productos.map((producto) => (
                                                <SelectItem key={`p-${producto.id}`} value={`p:${producto.id}`}>
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
                                    placeholder="Mano de obra / servicio"
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
                                        setLinea(index, { precio_unitario: e.target.value })
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
                        onClick={() =>
                            setData('lineas', [
                                ...data.lineas,
                                {
                                    concepto: '',
                                    cantidad: '1',
                                    precio_unitario: '',
                                    producto_id: '',
                                    servicio_id: '',
                                },
                            ])
                        }
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

                <FormSection index={1} title="Comprobante" columns={1}>
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
                                <SelectItem value="0">Ticket interno (sin SUNAT)</SelectItem>
                                <SelectItem value="2">Boleta de venta</SelectItem>
                                <SelectItem value="1">Factura</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                    {data.tipo_comprobante_sunat !== '0' && !felReady && (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            APISUNAT no está configurado. El cobro se registra igual; podrás
                            emitir el comprobante cuando guardes el token.
                        </p>
                    )}
                    {data.tipo_comprobante_sunat === '1' &&
                        orden?.cliente?.tipo_documento !== 'RUC' && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                La factura exige un cliente con RUC. El cobro se registra, pero
                                SUNAT rechazará el comprobante.
                            </p>
                        )}
                </FormSection>

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
                                            <SelectItem key={metodo.value} value={metodo.value}>
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

                <FormField id="cobro-notas" label="Notas" error={errors.notas}>
                    <Textarea
                        id="cobro-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={2}
                    />
                </FormField>
            </div>
        </FormModal>
    );
}
