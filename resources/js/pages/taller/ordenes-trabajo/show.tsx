import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    Camera,
    CheckCircle2,
    Circle,
    ClipboardList,
    Link2,
    Loader2,
    MoreHorizontal,
    Package,
    Plus,
    Save,
    Trash2,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FormField, FormSection } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks/use-permission';
import { expandServicioConKit, spliceLinesAtIndex } from '@/lib/servicio-kit';
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import { OrdenAvisarListaModal } from './components/orden-avisar-lista-modal';
import { OrdenCobroModal } from './components/orden-cobro-modal';
import { OrdenFotosSection } from './components/orden-fotos-section';
import type {
    ClienteOption,
    MiSesionAbierta,
    OrdenEstado,
    OrdenIgv,
    OrdenLinea,
    OrdenTrabajo,
    ProductoCobroOption,
    SedeOption,
    ServicioCobroOption,
    VehiculoOption,
} from './types';

type LineaForm = {
    servicio_id: string;
    producto_id: string;
    descripcion: string;
    cantidad: string;
    precio_unitario: string;
};

type OrdenFormData = {
    sede_id: string;
    cliente_id: string;
    vehiculo_id: string;
    estado: OrdenEstado;
    prometida_at: string;
    km_ingreso: string;
    km_salida: string;
    solicitud_cliente: string;
    diagnostico: string;
    notas_internas: string;
    lineas: LineaForm[];
};

type ShowProps = {
    orden: OrdenTrabajo & {
        en_proceso_at?: string | null;
        cita?: { id: string; motivo: string | null; inicia_at: string | null } | null;
    };
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    mi_sesion_abierta: MiSesionAbierta;
    igv: OrdenIgv;
    fel_ready?: boolean;
    taller_nombre?: string;
    productos: readonly ProductoCobroOption[];
    servicios: readonly ServicioCobroOption[];
};

type TabId = 'recepcion' | 'cargos' | 'fotos' | 'mas';

const LIBRE = '__libre__';

const ESTADOS: { value: OrdenEstado; label: string }[] = [
    { value: 'abierta', label: 'Abierta' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'lista', label: 'Lista' },
    { value: 'entregada', label: 'Entregada' },
    { value: 'anulada', label: 'Anulada' },
];

const ESTADO_CLASS: Record<OrdenEstado, string> = {
    abierta: 'bg-sky-100 text-sky-900 border-sky-300',
    en_proceso: 'bg-amber-100 text-amber-950 border-amber-300',
    lista: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    entregada: 'bg-violet-100 text-violet-900 border-violet-300',
    anulada: 'bg-rose-100 text-rose-900 border-rose-300',
};

const TABS: {
    id: TabId;
    label: string;
    icon: typeof ClipboardList;
}[] = [
    { id: 'recepcion', label: 'Recepción', icon: ClipboardList },
    { id: 'cargos', label: 'Cargos', icon: Package },
    { id: 'fotos', label: 'Fotos', icon: Camera },
    { id: 'mas', label: 'Más', icon: MoreHorizontal },
];

const defaultTab = (estado: OrdenEstado): TabId => {
    if (estado === 'abierta') {
        return 'recepcion';
    }

    if (estado === 'en_proceso') {
        return 'fotos';
    }

    if (estado === 'lista' || estado === 'entregada') {
        return 'mas';
    }

    return 'recepcion';
};

const toDatetimeLocal = (iso: string | null): string => {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toLineas = (lineas: readonly OrdenLinea[] | undefined): LineaForm[] =>
    (lineas ?? []).map((linea) => ({
        servicio_id: linea.servicio_id ?? '',
        producto_id: linea.producto_id ?? '',
        descripcion: linea.descripcion,
        cantidad: String(linea.cantidad ?? 1),
        precio_unitario: String(linea.precio_unitario ?? ''),
    }));

const emptyLinea = (): LineaForm => ({
    servicio_id: '',
    producto_id: '',
    descripcion: '',
    cantidad: '1',
    precio_unitario: '',
});

const catalogValue = (linea: LineaForm): string => {
    if (linea.servicio_id) {
        return `s:${linea.servicio_id}`;
    }

    if (linea.producto_id) {
        return `p:${linea.producto_id}`;
    }

    return LIBRE;
};

const money = (value: number): string =>
    value.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

const formatWhen = (iso: string | null | undefined): string => {
    if (!iso) {
        return '—';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Show({
    orden,
    sedes,
    clientes,
    vehiculos,
    mi_sesion_abierta: miSesion,
    igv,
    taller_nombre: tallerNombre = 'el taller',
    productos = [],
    servicios = [],
    fel_ready: felReady = false,
}: ShowProps) {
    const { can } = usePermission();
    const canUpdate = can('ordenes-trabajo.update');
    const canCobrar = can('ventas.create');
    const [cobrarOpen, setCobrarOpen] = useState(false);
    const [avisarOpen, setAvisarOpen] = useState(false);
    const [tab, setTab] = useState<TabId>(() => defaultTab(orden.estado));

    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<OrdenFormData>({
        sede_id: orden.sede_id,
        cliente_id: orden.cliente_id,
        vehiculo_id: orden.vehiculo_id,
        estado: orden.estado,
        prometida_at: toDatetimeLocal(orden.prometida_at),
        km_ingreso: orden.km_ingreso != null ? String(orden.km_ingreso) : '',
        km_salida: orden.km_salida != null ? String(orden.km_salida) : '',
        solicitud_cliente: orden.solicitud_cliente ?? '',
        diagnostico: orden.diagnostico ?? '',
        notas_internas: orden.notas_internas ?? '',
        lineas: toLineas(orden.lineas),
    });

    const vehiculosFiltrados = useMemo(
        () => vehiculos.filter((v) => v.cliente_id === data.cliente_id),
        [vehiculos, data.cliente_id],
    );

    const precuentaTotal = useMemo(() => {
        return data.lineas.reduce((sum, linea) => {
            const cant = Number(String(linea.cantidad).replace(',', '.')) || 0;
            const pu = Number(String(linea.precio_unitario).replace(',', '.')) || 0;

            return sum + cant * pu;
        }, 0);
    }, [data.lineas]);

    const saldo = Number(orden.saldo) || Math.max(0, precuentaTotal - Number(orden.pagado_total || 0));
    const puedePasarAVenta =
        canCobrar && orden.estado !== 'anulada' && data.lineas.some((l) => l.descripcion.trim() !== '');

    const showSaveBar = canUpdate && (tab === 'recepcion' || tab === 'cargos');

    const timeline = useMemo(
        () => [
            {
                key: 'abierta',
                label: 'Recepcionada',
                at: orden.ingreso_at,
                done: true,
            },
            {
                key: 'en_proceso',
                label: 'En taller',
                at: orden.en_proceso_at ?? null,
                done: ['en_proceso', 'lista', 'entregada'].includes(orden.estado),
            },
            {
                key: 'lista',
                label: 'Lista para entregar',
                at: orden.lista_at,
                done: ['lista', 'entregada'].includes(orden.estado),
            },
            {
                key: 'entregada',
                label: 'Entregada',
                at: orden.entregada_at,
                done: orden.estado === 'entregada',
            },
        ],
        [orden],
    );

    const setLinea = (index: number, patch: Partial<LineaForm>) => {
        setData(
            'lineas',
            data.lineas.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
        );
    };

    const applyCatalog = (index: number, value: string) => {
        if (value === LIBRE) {
            setLinea(index, { servicio_id: '', producto_id: '' });

            return;
        }

        if (value.startsWith('s:')) {
            const id = value.slice(2);
            const servicio = servicios.find((item) => item.id === id);
            const expanded = expandServicioConKit({
                servicioId: id,
                servicioNombre: servicio?.nombre ?? data.lineas[index]?.descripcion ?? '',
                servicioPrecio: servicio?.precio,
                kit: servicio?.kit,
                cantidadServicio: data.lineas[index]?.cantidad ?? '1',
                buildServicioLine: ({ servicio_id, producto_id, cantidad, precio_unitario, label }) => ({
                    servicio_id,
                    producto_id,
                    descripcion: label,
                    cantidad,
                    precio_unitario:
                        precio_unitario || data.lineas[index]?.precio_unitario || '',
                }),
                buildProductoLine: ({ servicio_id, producto_id, cantidad, precio_unitario, label }) => ({
                    servicio_id,
                    producto_id,
                    descripcion: label,
                    cantidad,
                    precio_unitario,
                }),
            });

            setData('lineas', spliceLinesAtIndex(data.lineas, index, expanded));

            return;
        }

        if (value.startsWith('p:')) {
            const id = value.slice(2);
            const producto = productos.find((item) => item.id === id);
            setLinea(index, {
                servicio_id: '',
                producto_id: id,
                descripcion: producto?.nombre ?? data.lineas[index]?.descripcion ?? '',
                precio_unitario:
                    producto?.precio_venta != null
                        ? String(producto.precio_venta)
                        : data.lineas[index]?.precio_unitario ?? '',
            });
        }
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canUpdate) {
            return;
        }

        put(ordenesTrabajo.update(orden.id).url, { preserveScroll: true });
    };

    const copyLink = async () => {
        if (!orden.public_token) {
            toastManager.error({ title: 'Esta orden aún no tiene link público.' });

            return;
        }

        const url = `${window.location.origin}/ot/${orden.public_token}`;

        try {
            await navigator.clipboard.writeText(url);
            toastManager.success({ title: 'Link de seguimiento copiado.' });
        } catch {
            toastManager.error({ title: 'No se pudo copiar el link.' });
        }
    };

    const clienteNombre = orden.cliente
        ? `${orden.cliente.nombres} ${orden.cliente.apellidos ?? ''}`.trim()
        : 'Cliente';
    const placa = orden.vehiculo?.placa ?? '';
    const shortMeta = [clienteNombre, placa].filter(Boolean).join(' · ');

    const tabButtonClass = (id: TabId, variant: 'desktop' | 'mobile') =>
        cn(
            'flex cursor-pointer items-center justify-center gap-1.5 transition-colors',
            variant === 'desktop' &&
                'min-h-11 flex-1 rounded-md px-3 text-sm font-medium',
            variant === 'mobile' &&
                'min-h-11 flex-1 flex-col gap-0.5 px-1 text-[11px] font-medium',
            tab === id
                ? variant === 'desktop'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-brand-700'
                : 'text-muted-foreground hover:text-foreground',
        );

    return (
        <>
            <Head title={`${orden.numero} · Orden de trabajo`} />

            <div
                className={cn(
                    'flex flex-1 flex-col gap-4 p-4 sm:p-6',
                    // Espacio para tabs móviles + barra flotante de guardar (estilo VetSaaS)
                    showSaveBar
                        ? 'pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))] lg:pb-28'
                        : 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-6',
                )}
            >
                {/* Compact header */}
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 size-11 shrink-0 cursor-pointer"
                        asChild
                    >
                        <Link href={ordenesTrabajo.index().url} aria-label="Volver a órdenes">
                            <ArrowLeft className="size-5" strokeWidth={2.25} />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Wrench className="size-5 shrink-0 text-brand-600" strokeWidth={2} />
                            <h1 className="font-mono text-lg font-semibold tracking-tight sm:text-xl">
                                {orden.numero}
                            </h1>
                            <Badge
                                variant="outline"
                                className={cn('font-normal', ESTADO_CLASS[orden.estado])}
                            >
                                {ESTADOS.find((e) => e.value === orden.estado)?.label ?? orden.estado}
                            </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{shortMeta}</p>
                    </div>
                </div>

                {/* Desktop segmented tabs */}
                <div
                    className="hidden rounded-lg bg-muted/70 p-1 lg:flex"
                    role="tablist"
                    aria-label="Secciones de la orden"
                >
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            className={tabButtonClass(id, 'desktop')}
                            onClick={() => setTab(id)}
                        >
                            <Icon className="size-4 shrink-0" strokeWidth={2.25} />
                            {label}
                        </button>
                    ))}
                </div>

                <form id="orden-trabajo-form" onSubmit={onSubmit} className="flex flex-col gap-5">
                    {sedes.length === 0 && tab === 'recepcion' ? (
                        <p
                            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                            role="alert"
                        >
                            Primero crea una sede en Configuración → Sedes.
                        </p>
                    ) : null}

                    {/* Recepción */}
                    <div
                        role="tabpanel"
                        hidden={tab !== 'recepcion'}
                        className={cn('flex flex-col gap-5', tab !== 'recepcion' && 'hidden')}
                    >
                        <FormSection
                            index={0}
                            title="Cliente y vehículo"
                            description="Datos de recepción ligados a la orden."
                            columns={2}
                        >
                            <FormField id="ot-sede" label="Sede" required error={errors.sede_id}>
                                <Select
                                    value={data.sede_id || undefined}
                                    onValueChange={(value) => setData('sede_id', value)}
                                    disabled={!canUpdate}
                                >
                                    <SelectTrigger id="ot-sede" className="min-h-11 w-full">
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

                            <FormField id="ot-cliente" label="Cliente" required error={errors.cliente_id}>
                                <Select
                                    value={data.cliente_id || undefined}
                                    onValueChange={(value) => {
                                        setData('cliente_id', value);
                                        setData('vehiculo_id', '');
                                    }}
                                    disabled={!canUpdate}
                                >
                                    <SelectTrigger id="ot-cliente" className="min-h-11 w-full">
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

                            <FormField
                                id="ot-vehiculo"
                                label="Vehículo"
                                required
                                error={errors.vehiculo_id}
                                className="sm:col-span-2"
                            >
                                <Select
                                    value={data.vehiculo_id || undefined}
                                    onValueChange={(value) => setData('vehiculo_id', value)}
                                    disabled={!canUpdate || !data.cliente_id}
                                >
                                    <SelectTrigger id="ot-vehiculo" className="min-h-11 w-full">
                                        <SelectValue
                                            placeholder={
                                                data.cliente_id
                                                    ? 'Selecciona vehículo'
                                                    : 'Primero el cliente'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehiculosFiltrados.map((vehiculo) => (
                                            <SelectItem key={vehiculo.id} value={vehiculo.id}>
                                                {vehiculo.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </FormSection>

                        <FormSection
                            index={1}
                            title="Recepción y diagnóstico"
                            description="Km de ingreso, solicitud del cliente y hallazgos del taller."
                            columns={2}
                        >
                            <FormField id="ot-estado" label="Estado" error={errors.estado}>
                                <Select
                                    value={data.estado}
                                    onValueChange={(value) => setData('estado', value as OrdenEstado)}
                                    disabled={!canUpdate}
                                >
                                    <SelectTrigger id="ot-estado" className="min-h-11 w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ESTADOS.map((estado) => (
                                            <SelectItem key={estado.value} value={estado.value}>
                                                {estado.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>

                            <FormField
                                id="ot-prometida"
                                label="Fecha prometida"
                                error={errors.prometida_at}
                            >
                                <Input
                                    id="ot-prometida"
                                    type="datetime-local"
                                    className="min-h-11"
                                    value={data.prometida_at}
                                    onChange={(e) => setData('prometida_at', e.target.value)}
                                    disabled={!canUpdate}
                                />
                            </FormField>

                            <FormField id="ot-km-ingreso" label="Km de ingreso" error={errors.km_ingreso}>
                                <Input
                                    id="ot-km-ingreso"
                                    type="number"
                                    min="0"
                                    className="min-h-11"
                                    value={data.km_ingreso}
                                    onChange={(e) => setData('km_ingreso', e.target.value)}
                                    disabled={!canUpdate}
                                />
                            </FormField>

                            <FormField id="ot-km-salida" label="Km de salida" error={errors.km_salida}>
                                <Input
                                    id="ot-km-salida"
                                    type="number"
                                    min="0"
                                    className="min-h-11"
                                    value={data.km_salida}
                                    onChange={(e) => setData('km_salida', e.target.value)}
                                    disabled={!canUpdate}
                                />
                            </FormField>

                            <FormField
                                id="ot-solicitud"
                                label="Solicitud del cliente"
                                error={errors.solicitud_cliente}
                                className="sm:col-span-2"
                            >
                                <Textarea
                                    id="ot-solicitud"
                                    value={data.solicitud_cliente}
                                    onChange={(e) => setData('solicitud_cliente', e.target.value)}
                                    rows={3}
                                    placeholder="Ruido en el motor, cambio de aceite…"
                                    disabled={!canUpdate}
                                    className="min-h-24"
                                />
                                {orden.cita?.motivo &&
                                orden.cita.motivo !== (orden.solicitud_cliente ?? '') ? (
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        Motivo de la cita: {orden.cita.motivo}
                                    </p>
                                ) : null}
                            </FormField>

                            <FormField
                                id="ot-diagnostico"
                                label="Diagnóstico"
                                error={errors.diagnostico}
                                className="sm:col-span-2"
                            >
                                <Textarea
                                    id="ot-diagnostico"
                                    value={data.diagnostico}
                                    onChange={(e) => setData('diagnostico', e.target.value)}
                                    rows={3}
                                    disabled={!canUpdate}
                                    className="min-h-24"
                                />
                            </FormField>

                            <FormField
                                id="ot-notas"
                                label="Notas internas"
                                error={errors.notas_internas}
                                className="sm:col-span-2"
                            >
                                <Textarea
                                    id="ot-notas"
                                    value={data.notas_internas}
                                    onChange={(e) => setData('notas_internas', e.target.value)}
                                    rows={2}
                                    disabled={!canUpdate}
                                    className="min-h-20"
                                />
                            </FormField>
                        </FormSection>
                    </div>

                    {/* Cargos */}
                    <div
                        role="tabpanel"
                        hidden={tab !== 'cargos'}
                        className={cn('flex flex-col gap-5', tab !== 'cargos' && 'hidden')}
                    >
                        <FormSection
                            index={2}
                            title="Precuenta · servicios y repuestos"
                            description="Cargos de la OT. La venta formal se confirma en caja al pasar a venta."
                            columns={1}
                        >
                            {data.lineas.map((linea, index) => (
                                <div key={index} className="grid gap-2 rounded-md border p-3">
                                    {(servicios.length > 0 || productos.length > 0) && (
                                        <FormField
                                            id={`ot-linea-cat-${index}`}
                                            label={index === 0 ? 'Catálogo' : ''}
                                            error={
                                                errors[`lineas.${index}.servicio_id`] ||
                                                errors[`lineas.${index}.producto_id`]
                                            }
                                        >
                                            <Select
                                                value={catalogValue(linea)}
                                                onValueChange={(value) => applyCatalog(index, value)}
                                                disabled={!canUpdate}
                                            >
                                                <SelectTrigger
                                                    id={`ot-linea-cat-${index}`}
                                                    className="min-h-11"
                                                >
                                                    <SelectValue placeholder="Libre / catálogo" />
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
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormField>
                                    )}
                                    <div className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
                                        <FormField
                                            id={`ot-linea-desc-${index}`}
                                            label={index === 0 ? 'Descripción' : ''}
                                            error={errors[`lineas.${index}.descripcion`]}
                                        >
                                            <Input
                                                id={`ot-linea-desc-${index}`}
                                                className="min-h-11"
                                                value={linea.descripcion}
                                                onChange={(e) =>
                                                    setLinea(index, { descripcion: e.target.value })
                                                }
                                                placeholder="Mano de obra o pieza"
                                                disabled={!canUpdate}
                                            />
                                        </FormField>
                                        <FormField
                                            id={`ot-linea-qty-${index}`}
                                            label={index === 0 ? 'Cant.' : ''}
                                            error={errors[`lineas.${index}.cantidad`]}
                                        >
                                            <Input
                                                id={`ot-linea-qty-${index}`}
                                                type="number"
                                                min="0.001"
                                                step="0.001"
                                                className="min-h-11"
                                                value={linea.cantidad}
                                                onChange={(e) =>
                                                    setLinea(index, { cantidad: e.target.value })
                                                }
                                                disabled={!canUpdate}
                                            />
                                        </FormField>
                                        <FormField
                                            id={`ot-linea-pu-${index}`}
                                            label={index === 0 ? 'P. unitario' : ''}
                                            error={errors[`lineas.${index}.precio_unitario`]}
                                        >
                                            <Input
                                                id={`ot-linea-pu-${index}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="min-h-11"
                                                value={linea.precio_unitario}
                                                onChange={(e) =>
                                                    setLinea(index, {
                                                        precio_unitario: e.target.value,
                                                    })
                                                }
                                                disabled={!canUpdate}
                                            />
                                        </FormField>
                                        {canUpdate ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-6 size-11 cursor-pointer sm:mt-6"
                                                onClick={() =>
                                                    setData(
                                                        'lineas',
                                                        data.lineas.filter((_, i) => i !== index),
                                                    )
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                            {canUpdate ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 cursor-pointer gap-1.5 self-start"
                                    onClick={() => setData('lineas', [...data.lineas, emptyLinea()])}
                                >
                                    <Plus className="size-4" />
                                    Agregar cargo
                                </Button>
                            ) : null}
                            {errors.lineas && (
                                <p className="text-sm text-destructive">{errors.lineas}</p>
                            )}
                        </FormSection>
                    </div>
                </form>

                {/* Fotos */}
                {tab === 'fotos' ? (
                    <div role="tabpanel">
                        <OrdenFotosSection orden={orden} canUpdate={canUpdate} embedded />
                    </div>
                ) : null}

                {/* Más: acciones + timeline + precuenta */}
                {tab === 'mas' ? (
                    <div role="tabpanel" className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {orden.public_token ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 cursor-pointer gap-2"
                                    onClick={() => void copyLink()}
                                >
                                    <Link2 className="size-4" strokeWidth={2.25} />
                                    Link cliente
                                </Button>
                            ) : null}
                            {(orden.estado === 'lista' || orden.estado === 'entregada') &&
                            canUpdate ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 cursor-pointer gap-2"
                                    onClick={() => setAvisarOpen(true)}
                                >
                                    WhatsApp
                                </Button>
                            ) : null}
                            {puedePasarAVenta ? (
                                <Button
                                    type="button"
                                    className="min-h-11 cursor-pointer gap-2"
                                    onClick={() => setCobrarOpen(true)}
                                >
                                    <Banknote className="size-4" strokeWidth={2.5} />
                                    Pasar a venta
                                </Button>
                            ) : null}
                        </div>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ClipboardList className="size-4 text-brand-600" />
                                    Seguimiento
                                </CardTitle>
                                <CardDescription>
                                    Estados del vehículo en taller. El cliente ve el mismo timeline.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="relative ml-2.5 space-y-0 border-l border-border/80">
                                    {timeline.map((step) => (
                                        <li key={step.key} className="relative pb-4 pl-5 last:pb-0">
                                            <span className="absolute -left-[9px] top-0.5 bg-background">
                                                {step.done ? (
                                                    <CheckCircle2 className="size-4 text-brand-600" />
                                                ) : (
                                                    <Circle className="size-4 text-muted-foreground/40" />
                                                )}
                                            </span>
                                            <p
                                                className={cn(
                                                    'text-sm',
                                                    step.done
                                                        ? 'font-medium text-foreground'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {step.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {step.done ? formatWhen(step.at) : 'Pendiente'}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Precuenta</CardTitle>
                                <CardDescription>
                                    Resumen de cargos. Confirma el cobro en Ventas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Cargos (borrador)</span>
                                    <span className="font-medium tabular-nums">
                                        {money(precuentaTotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Total OT</span>
                                    <span className="font-medium tabular-nums">
                                        {money(Number(orden.total) || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Pagado</span>
                                    <span className="tabular-nums">
                                        {money(Number(orden.pagado_total) || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-2 border-t pt-3">
                                    <span className="font-medium">Saldo</span>
                                    <span className="font-semibold tabular-nums text-brand-700">
                                        {money(saldo)}
                                    </span>
                                </div>
                                {puedePasarAVenta ? (
                                    <Button
                                        type="button"
                                        className="mt-1 min-h-11 w-full cursor-pointer gap-2"
                                        onClick={() => setCobrarOpen(true)}
                                    >
                                        <Banknote className="size-4" />
                                        Pasar a venta
                                    </Button>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Agrega servicios o repuestos y guarda para habilitar la venta.
                                    </p>
                                )}
                                {!miSesion && puedePasarAVenta ? (
                                    <p className="text-xs text-amber-700">
                                        Necesitas caja abierta para cobrar.
                                    </p>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </div>

            {/* Barra flotante de guardar (estilo VetSaaS) */}
            {showSaveBar ? (
                <div
                    className={cn(
                        'fixed right-2 z-40 w-[calc(100%-1rem)] max-w-xl rounded-xl border border-border/70 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md',
                        'md:w-[calc(100vw-var(--sidebar-width,16rem)-2rem)]',
                        // Encima de la barra de tabs en móvil
                        'bottom-[calc(3.75rem+0.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-2',
                    )}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <Wrench
                                className="size-4 shrink-0 text-brand-600/80"
                                strokeWidth={2.25}
                            />
                            <span className="truncate">{orden.numero}</span>
                        </div>
                        <Button
                            type="submit"
                            form="orden-trabajo-form"
                            disabled={processing}
                            className="h-10 shrink-0 cursor-pointer gap-2 disabled:cursor-not-allowed"
                        >
                            {processing ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : recentlySuccessful ? (
                                <CheckCircle2 className="size-4" strokeWidth={2.5} />
                            ) : (
                                <Save className="size-4" strokeWidth={2.5} />
                            )}
                            {recentlySuccessful ? 'Guardado' : 'Guardar cambios'}
                        </Button>
                    </div>
                </div>
            ) : null}

            {/* Mobile bottom tab bar */}
            <nav
                className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
                aria-label="Navegación de la orden"
            >
                <div className="flex min-h-15 items-stretch" role="tablist">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            className={tabButtonClass(id, 'mobile')}
                            onClick={() => setTab(id)}
                        >
                            <Icon
                                className={cn('size-5', tab === id && 'text-brand-700')}
                                strokeWidth={tab === id ? 2.5 : 2}
                            />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <OrdenCobroModal
                open={cobrarOpen}
                onOpenChange={setCobrarOpen}
                orden={orden}
                sesion={miSesion}
                igv={igv}
                productos={productos}
                servicios={servicios}
                felReady={felReady}
            />

            <OrdenAvisarListaModal
                open={avisarOpen}
                onOpenChange={setAvisarOpen}
                orden={orden}
                tallerNombre={tallerNombre}
            />
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        { title: 'Taller' },
        { title: 'Órdenes de trabajo', href: '/taller/ordenes-trabajo' },
        { title: 'Expediente' },
    ],
};
