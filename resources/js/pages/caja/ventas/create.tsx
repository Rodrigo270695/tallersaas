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
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { expandServicioConKit } from '@/lib/servicio-kit';
import { cn } from '@/lib/utils';
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

const mapOrdenLineas = (lineas: NonNullable<DesdeOrden>['lineas']): LineaForm[] =>
    lineas.map((linea) => ({
        servicio_id: linea.servicio_id ?? '',
        producto_id: linea.producto_id ?? '',
        concepto: linea.concepto,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
    }));

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

    const { data, setData, post, processing, errors, transform } = useForm<FormData>({
        cliente_id: desde_orden?.cliente_id ?? '',
        vehiculo_id: desde_orden?.vehiculo_id ?? '',
        orden_trabajo_id: desde_orden?.id ?? '',
        lineas: desde_orden?.lineas?.length ? mapOrdenLineas(desde_orden.lineas) : [],
        pagos: [{ metodo: 'efectivo', monto: '', monto_recibido: '' }],
        notas: '',
        tipo_comprobante_sunat: '0',
        caja_sesion_id: mi_sesion_abierta?.id ?? '',
    });

    const [catalogTab, setCatalogTab] = useState<'productos' | 'servicios'>('productos');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!emite_comprobantes_sunat && data.tipo_comprobante_sunat !== '0') {
            setData('tipo_comprobante_sunat', '0');
        }
    }, [emite_comprobantes_sunat, data.tipo_comprobante_sunat, setData]);

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

    const vuelto = useMemo(() => {
        if (pagoPrincipal.metodo !== 'efectivo') {
            return null;
        }

        const recibido = Number(pagoPrincipal.monto_recibido) || 0;

        if (recibido <= 0) {
            return null;
        }

        const diff = recibido - totales.total;

        return diff >= 0 ? diff : null;
    }, [pagoPrincipal.metodo, pagoPrincipal.monto_recibido, totales.total]);

    const tieneLineasValidas = data.lineas.some(
        (linea) => linea.concepto.trim() !== '' && Number(linea.precio_unitario) >= 0,
    );

    const canSubmit = Boolean(mi_sesion_abierta) && !processing && tieneLineasValidas;

    const setLinea = (index: number, patch: Partial<LineaForm>) => {
        setData(
            'lineas',
            data.lineas.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
        );
    };

    const setPagoPrincipal = (patch: Partial<PagoForm>) => {
        setData(
            'pagos',
            data.pagos.map((pago, i) => (i === 0 ? { ...pago, ...patch } : pago)),
        );
    };

    const addProducto = (producto: (typeof productos)[number]) => {
        setData('lineas', [
            ...data.lineas,
            {
                servicio_id: '',
                producto_id: producto.id,
                concepto: producto.nombre,
                cantidad: '1',
                precio_unitario:
                    producto.precio_venta != null ? String(producto.precio_venta) : '',
            },
        ]);
        setSearchQuery('');
    };

    const addServicio = (servicio: (typeof servicios)[number]) => {
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

        setData('lineas', [...data.lineas, ...expanded]);
        setSearchQuery('');
    };

    const adjustQty = (index: number, delta: number) => {
        const linea = data.lineas[index];
        const current = Number(linea.cantidad) || 1;
        const next = Math.max(0.001, current + delta);

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

        if (!mi_sesion_abierta || !tieneLineasValidas) {
            return;
        }

        const totalStr = totales.total.toFixed(2);

        transform((formData) => ({
            ...formData,
            tipo_comprobante_sunat: emite_comprobantes_sunat
                ? Number(formData.tipo_comprobante_sunat)
                : 0,
            orden_trabajo_id: formData.orden_trabajo_id || null,
            cliente_id: formData.cliente_id || null,
            vehiculo_id: formData.vehiculo_id || null,
            pagos: formData.pagos.map((pago, index) =>
                index === 0
                    ? {
                          ...pago,
                          monto: pago.monto.trim() !== '' ? pago.monto : totalStr,
                      }
                    : pago,
            ),
        }));

        post(ventas.store.url(), { preserveScroll: true });
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
                                    <Label htmlFor="venta-cliente">Cliente</Label>
                                    <Combobox
                                        id="venta-cliente"
                                        options={clienteOptions}
                                        value={data.cliente_id || null}
                                        onChange={(value) => {
                                            setData('cliente_id', value ?? '');
                                            if (!bloqueadoPorOrden) {
                                                setData('vehiculo_id', '');
                                            }
                                        }}
                                        placeholder="Sin cliente"
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
                                        <p className="text-sm text-destructive">{errors.cliente_id}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="venta-vehiculo">Vehículo</Label>
                                    <Combobox
                                        id="venta-vehiculo"
                                        options={vehiculoOptions}
                                        value={data.vehiculo_id || null}
                                        onChange={(value) => setData('vehiculo_id', value ?? '')}
                                        placeholder={
                                            data.cliente_id ? 'Sin vehículo' : 'Primero el cliente'
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
                                        <p className="text-sm text-destructive">{errors.vehiculo_id}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Tipo de comprobante */}
                        <section className="rounded-xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="mb-3 text-sm font-semibold text-foreground">
                                Tipo de comprobante
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

                                {!searchReady && searchQuery.trim().length > 0 && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Escribe al menos 2 caracteres para buscar.
                                    </p>
                                )}

                                {searchReady && (
                                    <ul className="mt-3 max-h-56 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60">
                                        {catalogTab === 'productos' ? (
                                            productosFiltrados.length > 0 ? (
                                                productosFiltrados.map((producto) => (
                                                    <li key={producto.id}>
                                                        <button
                                                            type="button"
                                                            className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-brand-50/60"
                                                            onClick={() => addProducto(producto)}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">
                                                                    {producto.nombre}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {producto.sku
                                                                        ? `SKU ${producto.sku} · `
                                                                        : ''}
                                                                    {producto.unidad}
                                                                </p>
                                                            </div>
                                                            <span className="shrink-0 text-sm font-medium tabular-nums text-brand-600">
                                                                {producto.precio_venta != null
                                                                    ? money(
                                                                          Number(producto.precio_venta),
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
                                                                ? money(Number(servicio.precio), moneda)
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
                            <h2 className="mb-4 text-sm font-semibold text-foreground">Carrito</h2>

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
                                    {data.lineas.map((linea, index) => (
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
                                                                value={linea.cantidad}
                                                                onChange={(e) =>
                                                                    setLinea(index, {
                                                                        cantidad: e.target.value,
                                                                    })
                                                                }
                                                                className="h-8 w-16 border-0 text-center shadow-none focus-visible:ring-0"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 cursor-pointer rounded-l-none"
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
                                    ))}
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
                                    <Label className="mb-2 block">Método de pago</Label>
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
                                        {METODOS_PAGO.map((metodo) => {
                                            const Icon = metodo.icon;
                                            const active = pagoPrincipal.metodo === metodo.value;

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
                                                    onClick={() =>
                                                        setPagoPrincipal({ metodo: metodo.value })
                                                    }
                                                >
                                                    <Icon className="size-4" strokeWidth={2} />
                                                    {metodo.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors['pagos.0.metodo'] && (
                                        <p className="mt-1 text-sm text-destructive">
                                            {errors['pagos.0.metodo']}
                                        </p>
                                    )}
                                </div>

                                {pagoPrincipal.metodo === 'efectivo' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="pago-recibido">Monto recibido</Label>
                                        <Input
                                            id="pago-recibido"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={pagoPrincipal.monto_recibido}
                                            onChange={(e) =>
                                                setPagoPrincipal({
                                                    monto_recibido: e.target.value,
                                                })
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

                                <Button
                                    type="submit"
                                    disabled={!canSubmit}
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
