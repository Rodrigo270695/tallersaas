import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    CreditCard,
    Loader2,
    Minus,
    Plus,
    Receipt,
    Search,
    Smartphone,
    Trash2,
    ArrowLeftRight,
    Wrench,
    Package,
    UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { expandServicioConKit } from '@/lib/servicio-kit';
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { ClienteFormModal } from '@/pages/taller/clientes/components/cliente-form-modal';
import ventas from '@/routes/caja/ventas';

type IgvConfig = {
    igv_porcentaje: string | number;
    igv_afectacion?: string;
    precio_incluye_igv: boolean;
    moneda: string;
};

type DesdeOrden = {
    id: string;
    numero: string;
    cliente_id: string;
    vehiculo_id: string | null;
    cliente_nombre?: string | null;
    vehiculo_label?: string | null;
    lineas: Array<{
        servicio_id: string | null;
        producto_id: string | null;
        concepto: string;
        cantidad: string;
        precio_unitario: string;
    }>;
} | null;

type LineaForm = {
    servicio_id: string;
    producto_id: string;
    concepto: string;
    cantidad: string;
    precio_unitario: string;
    /** Solo UI: stock de la sede de caja. No se envía al backend. */
    stock_disponible?: number;
    omitir_stock?: boolean;
};

type PagoForm = {
    metodo: string;
    monto: string;
    monto_recibido: string;
};

type FormData = {
    cliente_id: string;
    vehiculo_id: string;
    orden_trabajo_id: string;
    lineas: LineaForm[];
    pagos: PagoForm[];
    notas: string;
    tipo_comprobante_sunat: '0' | '1' | '2';
    caja_sesion_id: string;
};

type CreateProps = {
    mi_sesion_abierta: {
        id: string;
        sede_id: string;
        sede_nombre?: string | null;
        opened_at: string;
        saldo_apertura: string | number;
    } | null;
    igv: IgvConfig;
    emite_comprobantes_sunat?: boolean;
    fel_ready?: boolean;
    desde_orden?: DesdeOrden;
    clientes: readonly { id: string; nombre: string }[];
    vehiculos: readonly { id: string; cliente_id: string; label: string }[];
    productos: readonly {
        id: string;
        nombre: string;
        sku: string | null;
        precio_venta: string | number | null;
        unidad: string;
        stock_sede?: string | number | null;
    }[];
    servicios: readonly {
        id: string;
        nombre: string;
        precio: string | number | null;
        kit?: readonly {
            producto_id: string;
            nombre: string;
            cantidad: string | number;
            precio_venta: string | number | null;
            unidad: string;
        }[];
    }[];
};

const METODOS_PAGO = [
    { value: 'efectivo', label: 'Efectivo', icon: Banknote },
    { value: 'yape', label: 'Yape', icon: Smartphone },
    { value: 'plin', label: 'Plin', icon: Smartphone },
    { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
    { value: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight },
] as const;

const parseStock = (stockSede: string | number | null | undefined): number => {
    const n = Number(stockSede ?? 0);

    return Number.isFinite(n) ? n : 0;
};

const mapOrdenLineas = (
    lineas: NonNullable<DesdeOrden>['lineas'],
    stockByProducto: Map<string, number>,
): LineaForm[] =>
    lineas.map((linea) => {
        const productoId = linea.producto_id ?? '';
        const tieneProducto = productoId !== '';
        const stock = tieneProducto ? (stockByProducto.get(productoId) ?? 0) : 999999;

        return {
            servicio_id: linea.servicio_id ?? '',
            producto_id: productoId,
            concepto: linea.concepto,
            cantidad: linea.cantidad,
            precio_unitario: linea.precio_unitario,
            stock_disponible: stock,
            omitir_stock: !tieneProducto,
        };
    });

const money = (value: number, currency = 'PEN'): string =>
    value.toLocaleString('es-PE', { style: 'currency', currency });

function Create({
    mi_sesion_abierta,
    igv,
    emite_comprobantes_sunat = false,
    fel_ready = false,
    desde_orden = null,
    clientes = [],
    vehiculos = [],
    productos = [],
    servicios = [],
}: CreateProps) {
    const bloqueadoPorOrden = Boolean(desde_orden);
    const moneda = igv.moneda === 'USD' ? 'USD' : 'PEN';
    const simboloMoneda = moneda === 'USD' ? '$' : 'S/';

    const stockByProducto = useMemo(() => {
        const map = new Map<string, number>();
        for (const producto of productos) {
            map.set(producto.id, parseStock(producto.stock_sede));
        }

        return map;
    }, [productos]);

    const { data, setData, post, processing, errors, transform } = useForm<FormData>({
        cliente_id: desde_orden?.cliente_id ?? '',
        vehiculo_id: desde_orden?.vehiculo_id ?? '',
        orden_trabajo_id: desde_orden?.id ?? '',
        lineas: desde_orden?.lineas?.length
            ? mapOrdenLineas(desde_orden.lineas, stockByProducto)
            : [],
        pagos: [{ metodo: 'efectivo', monto: '', monto_recibido: '' }],
        notas: '',
        tipo_comprobante_sunat: '0',
        caja_sesion_id: mi_sesion_abierta?.id ?? '',
    });

    const [catalogTab, setCatalogTab] = useState<'productos' | 'servicios'>('productos');
    const [searchQuery, setSearchQuery] = useState('');
    const [nuevoClienteOpen, setNuevoClienteOpen] = useState(false);
    const [clientesLocales, setClientesLocales] = useState(clientes);
    const [pagoMixtoModo, setPagoMixtoModo] = useState(false);

    useEffect(() => {
        setClientesLocales(clientes);
    }, [clientes]);

    useEffect(() => {
        if (!emite_comprobantes_sunat && data.tipo_comprobante_sunat !== '0') {
            setData('tipo_comprobante_sunat', '0');
        }
    }, [emite_comprobantes_sunat, data.tipo_comprobante_sunat, setData]);

    const clienteOptions = useMemo(
        () => clientesLocales.map((c) => ({ value: c.id, label: c.nombre })),
        [clientesLocales],
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

    const searchTerm = searchQuery.trim().toLowerCase();
    const searchReady = searchTerm.length >= 2;

    const productosFiltrados = useMemo(() => {
        if (!searchReady) {
            return [];
        }

        return productos
            .filter(
                (p) =>
                    p.nombre.toLowerCase().includes(searchTerm) ||
                    (p.sku?.toLowerCase().includes(searchTerm) ?? false),
            )
            .slice(0, 24);
    }, [productos, searchReady, searchTerm]);

    const serviciosFiltrados = useMemo(() => {
        if (!searchReady) {
            return [];
        }

        return servicios
            .filter((s) => s.nombre.toLowerCase().includes(searchTerm))
            .slice(0, 24);
    }, [servicios, searchReady, searchTerm]);

    const pagoPrincipal = data.pagos[0] ?? {
        metodo: 'efectivo',
        monto: '',
        monto_recibido: '',
    };

    const esSoloEfectivo =
        data.pagos.length === 1 && data.pagos[0]?.metodo === 'efectivo';
    const esMixto = pagoMixtoModo && data.pagos.length > 1;

    const pagosSuma = useMemo(() => {
        if (data.pagos.length === 1) {
            const unico = Number(String(data.pagos[0].monto).replace(',', '.')) || 0;

            return unico > 0 ? unico : totales.total;
        }

        return data.pagos.reduce(
            (acc, pago) => acc + (Number(String(pago.monto).replace(',', '.')) || 0),
            0,
        );
    }, [data.pagos, totales.total]);

    const pagosCuadran = Math.abs(pagosSuma - totales.total) <= 0.01;

    const vuelto = useMemo(() => {
        if (!esSoloEfectivo) {
            return null;
        }

        const recibido = Number(String(pagoPrincipal.monto_recibido).replace(',', '.')) || 0;

        if (recibido <= 0) {
            return null;
        }

        const diff = recibido - totales.total;

        return diff >= 0 ? diff : null;
    }, [esSoloEfectivo, pagoPrincipal.monto_recibido, totales.total]);

    const tieneLineasValidas = data.lineas.some(
        (linea) =>
            linea.concepto.trim() !== '' &&
            Number(linea.cantidad) > 0 &&
            Number(linea.precio_unitario) >= 0,
    );

    const motivoBloqueo = useMemo(() => {
        if (!mi_sesion_abierta) {
            return 'Abre una caja antes de registrar la venta.';
        }
        if (!data.cliente_id) {
            return 'Selecciona un cliente.';
        }
        if (!tieneLineasValidas) {
            return 'Agrega al menos un producto o servicio al carrito.';
        }
        if (totales.total < 0.01) {
            return 'El total debe ser mayor a cero.';
        }
        const lineaSinStock = data.lineas.find(
            (linea) =>
                Boolean(linea.producto_id) &&
                !linea.omitir_stock &&
                (parseStock(linea.stock_disponible) <= 0 ||
                    Number(linea.cantidad) > parseStock(linea.stock_disponible) + 0.0001),
        );
        if (lineaSinStock) {
            return `Stock insuficiente para «${lineaSinStock.concepto}».`;
        }
        if (esMixto && !pagosCuadran) {
            return 'La suma de los pagos debe coincidir con el total.';
        }
        if (esSoloEfectivo) {
            const recibido =
                Number(String(pagoPrincipal.monto_recibido).replace(',', '.')) || 0;
            if (recibido > 0 && recibido + 0.001 < totales.total) {
                return 'El efectivo recibido no cubre el total.';
            }
        }

        return null;
    }, [
        mi_sesion_abierta,
        data.cliente_id,
        tieneLineasValidas,
        totales.total,
        esMixto,
        pagosCuadran,
        esSoloEfectivo,
        pagoPrincipal.monto_recibido,
        data.lineas,
    ]);

    const setLinea = (index: number, patch: Partial<LineaForm>) => {
        setData(
            'lineas',
            data.lineas.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
        );
    };

    const toggleMetodoPago = useCallback(
        (metodo: string) => {
            setData((prev) => {
                if (!pagoMixtoModo) {
                    if (prev.pagos.length === 1 && prev.pagos[0]?.metodo === metodo) {
                        return prev;
                    }

                    return {
                        ...prev,
                        pagos: [{ metodo, monto: '', monto_recibido: '' }],
                    };
                }

                const exists = prev.pagos.some((pago) => pago.metodo === metodo);
                let next = exists
                    ? prev.pagos.filter((pago) => pago.metodo !== metodo)
                    : [...prev.pagos, { metodo, monto: '', monto_recibido: '' }];

                if (next.length === 0) {
                    next = [{ metodo: 'efectivo', monto: '', monto_recibido: '' }];
                }
                if (next.length === 1) {
                    next = [{ ...next[0], monto: '', monto_recibido: '' }];
                }

                return { ...prev, pagos: next };
            });
        },
        [pagoMixtoModo, setData],
    );

    const activarPagoMixto = useCallback(() => {
        setPagoMixtoModo(true);
    }, []);

    const salirPagoMixto = useCallback(() => {
        setPagoMixtoModo(false);
        setData((prev) => {
            const keep = prev.pagos[0] ?? {
                metodo: 'efectivo',
                monto: '',
                monto_recibido: '',
            };

            return {
                ...prev,
                pagos: [{ metodo: keep.metodo, monto: '', monto_recibido: '' }],
            };
        });
    }, [setData]);

    const setPagoField = useCallback(
        (metodo: string, field: 'monto' | 'monto_recibido', value: string) => {
            setData((prev) => ({
                ...prev,
                pagos: prev.pagos.map((pago) =>
                    pago.metodo === metodo ? { ...pago, [field]: value } : pago,
                ),
            }));
        },
        [setData],
    );

    const addProducto = (producto: (typeof productos)[number]) => {
        const stock = parseStock(producto.stock_sede);

        if (stock <= 0) {
            toastManager.error({
                title: 'Sin stock en esta sede',
                description: `«${producto.nombre}» no tiene existencias en la sede de tu caja.`,
            });

            return;
        }

        const existingIndex = data.lineas.findIndex(
            (linea) => linea.producto_id === producto.id && !linea.servicio_id,
        );

        if (existingIndex >= 0) {
            const linea = data.lineas[existingIndex]!;
            const actual = Number(linea.cantidad) || 0;
            const disponible = parseStock(linea.stock_disponible ?? stock);

            if (actual + 1 > disponible + 0.0001) {
                toastManager.warning({
                    title: 'Stock insuficiente',
                    description: `Solo hay ${disponible} de «${producto.nombre}» en esta sede.`,
                });

                return;
            }

            setLinea(existingIndex, { cantidad: String(Number((actual + 1).toFixed(3))) });
            setSearchQuery('');

            return;
        }

        setData('lineas', [
            ...data.lineas,
            {
                servicio_id: '',
                producto_id: producto.id,
                concepto: producto.nombre,
                cantidad: '1',
                precio_unitario:
                    producto.precio_venta != null ? String(producto.precio_venta) : '',
                stock_disponible: stock,
                omitir_stock: false,
            },
        ]);
        setSearchQuery('');
    };

    const addServicio = (servicio: (typeof servicios)[number]) => {
        for (const item of servicio.kit ?? []) {
            const stock = stockByProducto.get(item.producto_id) ?? 0;
            const qtyKit = Math.max(Number(item.cantidad) || 0, 0);

            if (qtyKit > 0 && stock + 0.0001 < qtyKit) {
                toastManager.error({
                    title: 'Sin stock para el kit',
                    description: `«${item.nombre}» no tiene stock suficiente en esta sede (disponible: ${stock}).`,
                });

                return;
            }
        }

        const expanded = expandServicioConKit({
            servicioId: servicio.id,
            servicioNombre: servicio.nombre,
            servicioPrecio: servicio.precio,
            kit: servicio.kit,
            cantidadServicio: '1',
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
                precio_unitario,
                stock_disponible: 999999,
                omitir_stock: true,
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
                stock_disponible: stockByProducto.get(producto_id) ?? 0,
                omitir_stock: false,
            }),
        });

        setData('lineas', [...data.lineas, ...expanded]);
        setSearchQuery('');
    };

    const adjustQty = (index: number, delta: number) => {
        const linea = data.lineas[index];
        const current = Number(linea.cantidad) || 1;
        let next = Math.max(0.001, current + delta);

        if (!linea.omitir_stock && linea.producto_id) {
            const max = parseStock(linea.stock_disponible);

            if (delta > 0 && next > max + 0.0001) {
                toastManager.warning({
                    title: 'Stock insuficiente',
                    description: `Solo hay ${max} disponible de «${linea.concepto}».`,
                });
                next = Math.max(0.001, max);
            }
        }

        setLinea(index, { cantidad: String(Number(next.toFixed(3))) });
    };

    const removeLinea = (index: number) => {
        setData(
            'lineas',
            data.lineas.filter((_, i) => i !== index),
        );
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (processing) {
            return;
        }

        if (motivoBloqueo) {
            toastManager.error({ title: motivoBloqueo });

            return;
        }

        transform((formData) => {
            const pagosRaw =
                formData.pagos.length > 0
                    ? formData.pagos
                    : [{ metodo: 'efectivo', monto: '', monto_recibido: '' }];
            const esUnico = pagosRaw.length === 1;

            const pagos = pagosRaw.map((pago) => {
                const montoNum = Number(String(pago.monto).replace(',', '.')) || 0;
                const monto =
                    esUnico && (String(pago.monto).trim() === '' || montoNum <= 0)
                        ? totales.total
                        : montoNum;
                const montoFixed = Number(monto.toFixed(2));

                return {
                    metodo: pago.metodo || 'efectivo',
                    monto: montoFixed,
                    monto_recibido:
                        pago.metodo === 'efectivo' && esUnico
                            ? Number(String(pago.monto_recibido || '').replace(',', '.')) ||
                              montoFixed
                            : pago.metodo === 'efectivo'
                              ? montoFixed
                              : null,
                };
            });

            return {
                ...formData,
                tipo_comprobante_sunat: emite_comprobantes_sunat
                    ? Number(formData.tipo_comprobante_sunat)
                    : 0,
                orden_trabajo_id: formData.orden_trabajo_id || null,
                cliente_id: formData.cliente_id,
                vehiculo_id: formData.vehiculo_id || null,
                caja_sesion_id: formData.caja_sesion_id || mi_sesion_abierta?.id || null,
                lineas: formData.lineas.map(
                    ({ stock_disponible: _s, omitir_stock: _o, ...linea }) => linea,
                ),
                pagos,
            };
        });

        post(ventas.store.url(), {
            preserveScroll: true,
            onError: (errs) => {
                const messages = Object.values(errs).filter(
                    (m): m is string => typeof m === 'string' && m.length > 0,
                );
                toastManager.error({
                    title: 'No se pudo registrar la venta',
                    description:
                        messages.length > 0
                            ? messages.slice(0, 3).join(' · ')
                            : 'Revisa los datos e intenta de nuevo.',
                });
            },
        });
    };

    const pageTitle = desde_orden ? `Cobrar OT ${desde_orden.numero}` : 'Nueva venta';

    return (
        <>
            <Head title={pageTitle} />

            <div className="flex flex-1 flex-col gap-5 p-4 pb-8 sm:p-6">
                {/* Encabezado */}
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 size-10 shrink-0 cursor-pointer"
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
                                {pageTitle}
                            </h1>
                            {desde_orden && (
                                <Badge
                                    variant="outline"
                                    className="border-brand-200 bg-brand-50 text-brand-700"
                                >
                                    OT {desde_orden.numero}
                                </Badge>
                            )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {desde_orden
                                ? 'Cobra los conceptos de la orden de trabajo.'
                                : 'Venta de mostrador: repuestos o servicios sin orden de trabajo.'}
                        </p>
                    </div>
                </div>

                {!mi_sesion_abierta && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        No tienes una caja abierta.{' '}
                        <Link href="/caja/sesiones" className="font-medium underline">
                            Abrir caja
                        </Link>{' '}
                        para poder cobrar.
                    </p>
                )}

                <form onSubmit={onSubmit} className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    {/* Columna izquierda */}
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        {/* Cliente / vehículo */}
                        <section className="rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="mb-4 text-sm font-semibold text-foreground">
                                Cliente y vehículo
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="flex h-6 items-center justify-between gap-2">
                                        <Label htmlFor="venta-cliente">
                                            Cliente
                                            <span
                                                aria-hidden="true"
                                                className="ml-0.5 text-destructive"
                                            >
                                                *
                                            </span>
                                        </Label>
                                        {!bloqueadoPorOrden && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 gap-1 px-2 text-[11px] text-brand-700"
                                                disabled={!mi_sesion_abierta}
                                                onClick={() => setNuevoClienteOpen(true)}
                                            >
                                                <UserPlus className="size-3" aria-hidden />
                                                Nuevo cliente
                                            </Button>
                                        )}
                                    </div>
                                    <Combobox
                                        id="venta-cliente"
                                        options={clienteOptions}
                                        value={data.cliente_id || null}
                                        onChange={(value) => {
                                            setData((prev) => ({
                                                ...prev,
                                                cliente_id: value ?? '',
                                                vehiculo_id: bloqueadoPorOrden
                                                    ? prev.vehiculo_id
                                                    : '',
                                            }));
                                        }}
                                        placeholder="Seleccionar cliente"
                                        searchPlaceholder="Buscar cliente…"
                                        emptyMessage="Sin coincidencias."
                                        clearable={!bloqueadoPorOrden}
                                        disabled={bloqueadoPorOrden}
                                    />
                                    {bloqueadoPorOrden && desde_orden?.cliente_nombre && (
                                        <p className="text-xs text-muted-foreground">
                                            {desde_orden.cliente_nombre}
                                        </p>
                                    )}
                                    {errors.cliente_id && (
                                        <p className="text-sm text-destructive">
                                            {errors.cliente_id}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="venta-vehiculo">
                                        Vehículo{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opcional)
                                        </span>
                                    </Label>
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
                                        clearable={!bloqueadoPorOrden}
                                        disabled={bloqueadoPorOrden || !data.cliente_id}
                                    />
                                    {bloqueadoPorOrden && desde_orden?.vehiculo_label && (
                                        <p className="text-xs text-muted-foreground">
                                            {desde_orden.vehiculo_label}
                                        </p>
                                    )}
                                    {errors.vehiculo_id && (
                                        <p className="text-sm text-destructive">
                                            {errors.vehiculo_id}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Tipo de comprobante */}
                        <section className="rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="mb-3 text-sm font-semibold text-foreground">
                                Tipo de comprobante
                                <span aria-hidden="true" className="ml-0.5 text-destructive">
                                    *
                                </span>
                            </h2>
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                value={data.tipo_comprobante_sunat}
                                onValueChange={(value) => {
                                    if (value) {
                                        setData(
                                            'tipo_comprobante_sunat',
                                            value as FormData['tipo_comprobante_sunat'],
                                        );
                                    }
                                }}
                                className="w-full justify-stretch"
                            >
                                <ToggleGroupItem
                                    value="0"
                                    className="flex-1 cursor-pointer data-[state=on]:border-brand-300 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-700"
                                >
                                    Ticket
                                </ToggleGroupItem>
                                {emite_comprobantes_sunat && (
                                    <>
                                        <ToggleGroupItem
                                            value="2"
                                            className="flex-1 cursor-pointer data-[state=on]:border-brand-300 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-700"
                                        >
                                            Boleta
                                        </ToggleGroupItem>
                                        <ToggleGroupItem
                                            value="1"
                                            className="flex-1 cursor-pointer data-[state=on]:border-brand-300 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-700"
                                        >
                                            Factura
                                        </ToggleGroupItem>
                                    </>
                                )}
                            </ToggleGroup>

                            {!emite_comprobantes_sunat && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Solo ticket interno (SUNAT desactivado en Configuración &gt;
                                    General)
                                </p>
                            )}

                            {data.tipo_comprobante_sunat !== '0' && !fel_ready && (
                                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                    APISUNAT no está configurado. El cobro se registra igual; podrás
                                    emitir el comprobante cuando guardes el token.
                                </p>
                            )}

                            {errors.tipo_comprobante_sunat && (
                                <p className="mt-2 text-sm text-destructive">
                                    {errors.tipo_comprobante_sunat}
                                </p>
                            )}
                        </section>

                        {/* Catálogo */}
                        <section className="rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
                                <h2 className="mb-3 text-sm font-semibold text-foreground">
                                    Buscar productos / servicios
                                </h2>

                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={catalogTab}
                                    onValueChange={(value) => {
                                        if (value) {
                                            setCatalogTab(value as 'productos' | 'servicios');
                                        }
                                    }}
                                    className="mb-3"
                                >
                                    <ToggleGroupItem
                                        value="productos"
                                        className="cursor-pointer gap-1.5 px-4 data-[state=on]:border-brand-300 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-700"
                                    >
                                        <Package className="size-3.5" />
                                        Productos
                                    </ToggleGroupItem>
                                    <ToggleGroupItem
                                        value="servicios"
                                        className="cursor-pointer gap-1.5 px-4 data-[state=on]:border-brand-300 data-[state=on]:bg-brand-50 data-[state=on]:text-brand-700"
                                    >
                                        <Wrench className="size-3.5" />
                                        Servicios
                                    </ToggleGroupItem>
                                </ToggleGroup>

                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={
                                            catalogTab === 'productos'
                                                ? 'Buscar repuesto por nombre o SKU…'
                                                : 'Buscar servicio por nombre…'
                                        }
                                        className="pl-9"
                                    />
                                </div>

                                {catalogTab === 'productos' && mi_sesion_abierta?.sede_nombre && (
                                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                                        Stock e inventario de la sede «
                                        {mi_sesion_abierta.sede_nombre}».
                                    </p>
                                )}

                                {!searchReady && searchQuery.trim().length > 0 && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Escribe al menos 2 caracteres para buscar.
                                    </p>
                                )}

                                {searchReady && (
                                    <ul className="mt-3 max-h-56 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60">
                                        {catalogTab === 'productos' ? (
                                            productosFiltrados.length > 0 ? (
                                                productosFiltrados.map((producto) => {
                                                    const stock = parseStock(producto.stock_sede);
                                                    const sinStock = stock <= 0;

                                                    return (
                                                        <li
                                                            key={producto.id}
                                                            className={cn(
                                                                sinStock && 'bg-destructive/5',
                                                            )}
                                                        >
                                                            <button
                                                                type="button"
                                                                disabled={sinStock}
                                                                className={cn(
                                                                    'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors',
                                                                    sinStock
                                                                        ? 'cursor-not-allowed text-destructive'
                                                                        : 'cursor-pointer hover:bg-brand-50/60',
                                                                )}
                                                                onClick={() =>
                                                                    addProducto(producto)
                                                                }
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium">
                                                                        {producto.nombre}
                                                                    </p>
                                                                    <p
                                                                        className={cn(
                                                                            'text-xs',
                                                                            sinStock
                                                                                ? 'text-destructive'
                                                                                : 'text-muted-foreground',
                                                                        )}
                                                                    >
                                                                        {producto.sku
                                                                            ? `SKU ${producto.sku} · `
                                                                            : ''}
                                                                        {producto.unidad}
                                                                    </p>
                                                                </div>
                                                                <span
                                                                    className={cn(
                                                                        'flex shrink-0 flex-col items-end gap-0 text-xs tabular-nums',
                                                                        sinStock
                                                                            ? 'text-destructive'
                                                                            : 'text-muted-foreground',
                                                                    )}
                                                                >
                                                                    <span
                                                                        className={cn(
                                                                            'text-sm font-medium',
                                                                            !sinStock &&
                                                                                'text-brand-600',
                                                                        )}
                                                                    >
                                                                        {producto.precio_venta !=
                                                                        null
                                                                            ? money(
                                                                                  Number(
                                                                                      producto.precio_venta,
                                                                                  ),
                                                                                  moneda,
                                                                              )
                                                                            : '—'}
                                                                    </span>
                                                                    <span>
                                                                        {sinStock
                                                                            ? 'Sin stock en esta sede'
                                                                            : `Stock: ${stock}`}
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        </li>
                                                    );
                                                })
                                            ) : (
                                                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                    Sin resultados.
                                                </li>
                                            )
                                        ) : serviciosFiltrados.length > 0 ? (
                                            serviciosFiltrados.map((servicio) => (
                                                <li key={servicio.id}>
                                                    <button
                                                        type="button"
                                                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-brand-50/60"
                                                        onClick={() => addServicio(servicio)}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">
                                                                {servicio.nombre}
                                                            </p>
                                                            {(servicio.kit?.length ?? 0) > 0 && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Incluye kit de repuestos
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="shrink-0 text-sm font-medium tabular-nums text-brand-600">
                                                            {servicio.precio != null
                                                                ? money(
                                                                      Number(servicio.precio),
                                                                      moneda,
                                                                  )
                                                                : '—'}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                Sin resultados.
                                            </li>
                                        )}
                                    </ul>
                                )}
                        </section>

                        {/* Carrito */}
                        <section className="rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="mb-4 text-sm font-semibold text-foreground">
                                Carrito
                                <span aria-hidden="true" className="ml-0.5 text-destructive">
                                    *
                                </span>
                            </h2>

                            {data.lineas.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center">
                                    <Receipt className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">
                                        {bloqueadoPorOrden
                                            ? 'No hay líneas en esta orden.'
                                            : 'Agrega productos o servicios desde el buscador.'}
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/60">
                                    {data.lineas.map((linea, index) => {
                                        const stockMax = parseStock(linea.stock_disponible);
                                        const qty = Number(linea.cantidad) || 0;
                                        const sinStockLinea =
                                            Boolean(linea.producto_id) &&
                                            !linea.omitir_stock &&
                                            (stockMax <= 0 || qty > stockMax + 0.0001);
                                        const atMaxStock =
                                            Boolean(linea.producto_id) &&
                                            !linea.omitir_stock &&
                                            qty >= stockMax - 0.0001;

                                        return (
                                        <li key={index} className="py-3 first:pt-0 last:pb-0">
                                            <div className="flex items-start gap-3">
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <Input
                                                        value={linea.concepto}
                                                        onChange={(e) =>
                                                            setLinea(index, {
                                                                concepto: e.target.value,
                                                            })
                                                        }
                                                        className="h-8 border-transparent bg-transparent px-0 font-medium shadow-none focus-visible:border-border"
                                                        placeholder="Concepto"
                                                    />
                                                    {sinStockLinea && (
                                                        <p className="text-xs text-destructive">
                                                            Stock insuficiente
                                                            {stockMax > 0
                                                                ? ` (disponible: ${stockMax})`
                                                                : ' en esta sede'}
                                                            .
                                                        </p>
                                                    )}
                                                    {(errors[`lineas.${index}.concepto`] ||
                                                        errors[`lineas.${index}.cantidad`] ||
                                                        errors[`lineas.${index}.precio_unitario`]) && (
                                                        <p className="text-xs text-destructive">
                                                            {errors[`lineas.${index}.concepto`] ||
                                                                errors[`lineas.${index}.cantidad`] ||
                                                                errors[`lineas.${index}.precio_unitario`]}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="flex items-center rounded-md border border-border/60">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 cursor-pointer rounded-r-none"
                                                                onClick={() => adjustQty(index, -1)}
                                                            >
                                                                <Minus className="size-3.5" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                min="0.001"
                                                                step="0.001"
                                                                max={
                                                                    !linea.omitir_stock &&
                                                                    linea.producto_id
                                                                        ? stockMax
                                                                        : undefined
                                                                }
                                                                value={linea.cantidad}
                                                                onChange={(e) => {
                                                                    let value = e.target.value;
                                                                    const n = Number(value);
                                                                    if (
                                                                        !linea.omitir_stock &&
                                                                        linea.producto_id &&
                                                                        Number.isFinite(n) &&
                                                                        n > stockMax
                                                                    ) {
                                                                        value = String(stockMax);
                                                                    }
                                                                    setLinea(index, {
                                                                        cantidad: value,
                                                                    });
                                                                }}
                                                                className="h-8 w-16 border-0 text-center shadow-none focus-visible:ring-0"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 cursor-pointer rounded-l-none"
                                                                disabled={atMaxStock}
                                                                onClick={() => adjustQty(index, 1)}
                                                            >
                                                                <Plus className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs text-muted-foreground">
                                                                {simboloMoneda}
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={linea.precio_unitario}
                                                                onChange={(e) =>
                                                                    setLinea(index, {
                                                                        precio_unitario:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                className="h-8 w-24 tabular-nums"
                                                            />
                                                        </div>
                                                        <span className="ml-auto text-sm font-medium tabular-nums">
                                                            {money(
                                                                (Number(linea.cantidad) || 0) *
                                                                    (Number(linea.precio_unitario) ||
                                                                        0),
                                                                moneda,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeLinea(index)}
                                                    aria-label="Quitar línea"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {errors.lineas && (
                                <p className="mt-2 text-sm text-destructive">{errors.lineas}</p>
                            )}
                        </section>
                    </div>

                    {/* Sidebar cobro */}
                    <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-96 lg:self-start">
                        <div className="rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="mb-4 text-sm font-semibold text-foreground">Cobro</h2>

                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-2 block">
                                        Método de pago
                                        <span
                                            aria-hidden="true"
                                            className="ml-0.5 text-destructive"
                                        >
                                            *
                                        </span>
                                        {pagoMixtoModo && (
                                            <span className="ml-1 font-normal text-muted-foreground">
                                                (elige varios)
                                            </span>
                                        )}
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
                                        {METODOS_PAGO.map((metodo) => {
                                            const Icon = metodo.icon;
                                            const active = data.pagos.some(
                                                (pago) => pago.metodo === metodo.value,
                                            );

                                            return (
                                                <button
                                                    key={metodo.value}
                                                    type="button"
                                                    className={cn(
                                                        'flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors',
                                                        active
                                                            ? 'border-brand-400 bg-brand-50 text-brand-700'
                                                            : 'border-border/60 bg-white text-muted-foreground hover:border-brand-200 hover:bg-brand-50/40',
                                                    )}
                                                    onClick={() => toggleMetodoPago(metodo.value)}
                                                >
                                                    <Icon className="size-4" strokeWidth={2} />
                                                    {metodo.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-1.5">
                                        {pagoMixtoModo ? (
                                            <button
                                                type="button"
                                                onClick={salirPagoMixto}
                                                className="cursor-pointer text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                            >
                                                Un solo método
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={activarPagoMixto}
                                                className="cursor-pointer text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
                                            >
                                                Dividir pago
                                            </button>
                                        )}
                                    </div>
                                    {errors['pagos.0.metodo'] && (
                                        <p className="mt-1 text-sm text-destructive">
                                            {errors['pagos.0.metodo']}
                                        </p>
                                    )}
                                </div>

                                {esMixto && (
                                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                                        {data.pagos.map((pago) => {
                                            const label =
                                                METODOS_PAGO.find((m) => m.value === pago.metodo)
                                                    ?.label ?? pago.metodo;
                                            const restante = Math.max(
                                                0,
                                                Number(
                                                    (
                                                        totales.total -
                                                        data.pagos
                                                            .filter((p) => p.metodo !== pago.metodo)
                                                            .reduce(
                                                                (acc, p) =>
                                                                    acc +
                                                                    (Number(
                                                                        String(p.monto).replace(
                                                                            ',',
                                                                            '.',
                                                                        ),
                                                                    ) || 0),
                                                                0,
                                                            )
                                                    ).toFixed(2),
                                                ),
                                            );

                                            return (
                                                <div
                                                    key={pago.metodo}
                                                    className="flex items-center gap-2"
                                                >
                                                    <span className="w-24 shrink-0 truncate text-xs font-medium">
                                                        {label}
                                                    </span>
                                                    <Input
                                                        className="h-8 flex-1 tabular-nums"
                                                        inputMode="decimal"
                                                        placeholder={
                                                            restante > 0
                                                                ? String(restante)
                                                                : '0.00'
                                                        }
                                                        value={pago.monto}
                                                        onChange={(e) =>
                                                            setPagoField(
                                                                pago.metodo,
                                                                'monto',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className="cursor-pointer rounded-md border border-border/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                                        disabled={restante <= 0}
                                                        onClick={() =>
                                                            setPagoField(
                                                                pago.metodo,
                                                                'monto',
                                                                String(restante),
                                                            )
                                                        }
                                                    >
                                                        Resto
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <div
                                            className={cn(
                                                'flex justify-between text-xs tabular-nums',
                                                pagosCuadran
                                                    ? 'text-muted-foreground'
                                                    : 'font-semibold text-destructive',
                                            )}
                                        >
                                            <span>Suma de pagos</span>
                                            <span>
                                                {money(pagosSuma, moneda)} /{' '}
                                                {money(totales.total, moneda)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {esSoloEfectivo && (
                                    <div className="space-y-2">
                                        <Label htmlFor="pago-recibido">Monto recibido</Label>
                                        <Input
                                            id="pago-recibido"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={pagoPrincipal.monto_recibido}
                                            onChange={(e) =>
                                                setPagoField(
                                                    'efectivo',
                                                    'monto_recibido',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={money(totales.total, moneda)}
                                        />
                                        {errors['pagos.0.monto_recibido'] && (
                                            <p className="text-sm text-destructive">
                                                {errors['pagos.0.monto_recibido']}
                                            </p>
                                        )}
                                        {vuelto !== null && (
                                            <p className="text-sm text-muted-foreground">
                                                Vuelto:{' '}
                                                <span className="font-medium tabular-nums text-foreground">
                                                    {money(vuelto, moneda)}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 rounded-lg bg-muted/30 px-3 py-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="tabular-nums">
                                            {money(totales.subtotal, moneda)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            IGV ({igv.igv_porcentaje}%)
                                        </span>
                                        <span className="tabular-nums">
                                            {money(totales.igv, moneda)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums text-brand-700">
                                            {money(totales.total, moneda)}
                                        </span>
                                    </div>
                                </div>

                                {errors['pagos.0.monto'] && (
                                    <p className="text-sm text-destructive">
                                        {errors['pagos.0.monto']}
                                    </p>
                                )}
                                {errors.pagos && (
                                    <p className="text-sm text-destructive">{errors.pagos}</p>
                                )}

                                {motivoBloqueo && (
                                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                        {motivoBloqueo}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-11 w-full cursor-pointer gap-2 bg-brand-600 text-white hover:bg-brand-700 disabled:cursor-not-allowed"
                                >
                                    {processing && <Loader2 className="size-4 animate-spin" />}
                                    Registrar venta · {money(totales.total, moneda)}
                                </Button>

                                <div className="space-y-2">
                                    <Label htmlFor="venta-notas">Notas</Label>
                                    <Textarea
                                        id="venta-notas"
                                        value={data.notas}
                                        onChange={(e) => setData('notas', e.target.value)}
                                        rows={2}
                                        className="resize-none text-sm"
                                        placeholder="Observaciones opcionales…"
                                    />
                                    {errors.notas && (
                                        <p className="text-sm text-destructive">{errors.notas}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                </form>
            </div>

            <ClienteFormModal
                open={nuevoClienteOpen}
                onOpenChange={setNuevoClienteOpen}
                cliente={null}
                jsonStoreUrl="/caja/ventas/clientes-rapido"
                onCreated={(cliente) => {
                    setClientesLocales((prev) => {
                        if (prev.some((c) => c.id === cliente.id)) {
                            return prev;
                        }

                        return [...prev, { id: cliente.id, nombre: cliente.nombre }];
                    });
                    setData((prev) => ({
                        ...prev,
                        cliente_id: cliente.id,
                        vehiculo_id: '',
                    }));
                }}
            />
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: 'Caja' },
        { title: 'Ventas', href: '/caja/ventas' },
        { title: 'Nueva' },
    ],
};

export default Create;
