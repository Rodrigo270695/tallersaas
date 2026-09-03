import { useForm } from '@inertiajs/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef  } from 'react';
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
    ClienteOption,
    OrdenEstado,
    OrdenLinea,
    OrdenTrabajo,
    ProductoCobroOption,
    SedeOption,
    ServicioCobroOption,
    VehiculoOption,
} from '../types';

export type OrdenFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orden: OrdenTrabajo | null;
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    servicios?: readonly ServicioCobroOption[];
    productos?: readonly ProductoCobroOption[];
};

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

const emptyForm: OrdenFormData = {
    sede_id: '',
    cliente_id: '',
    vehiculo_id: '',
    estado: 'abierta',
    prometida_at: '',
    km_ingreso: '',
    km_salida: '',
    solicitud_cliente: '',
    diagnostico: '',
    notas_internas: '',
    lineas: [],
};

const LIBRE = '__libre__';

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

const ESTADOS: { value: OrdenEstado; label: string }[] = [
    { value: 'abierta', label: 'Abierta' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'lista', label: 'Lista' },
    { value: 'entregada', label: 'Entregada' },
    { value: 'anulada', label: 'Anulada' },
];

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

const buildInitialData = (
    orden: OrdenTrabajo | null,
    sedes: readonly SedeOption[],
): OrdenFormData => ({
    sede_id: orden?.sede_id ?? (sedes.length === 1 ? sedes[0].id : ''),
    cliente_id: orden?.cliente_id ?? '',
    vehiculo_id: orden?.vehiculo_id ?? '',
    estado: orden?.estado ?? 'abierta',
    prometida_at: toDatetimeLocal(orden?.prometida_at ?? null),
    km_ingreso: orden?.km_ingreso != null ? String(orden.km_ingreso) : '',
    km_salida: orden?.km_salida != null ? String(orden.km_salida) : '',
    solicitud_cliente: orden?.solicitud_cliente ?? '',
    diagnostico: orden?.diagnostico ?? '',
    notas_internas: orden?.notas_internas ?? '',
    lineas: toLineas(orden?.lineas),
});

const isFormValid = (data: OrdenFormData): boolean =>
    data.sede_id.length > 0 &&
    data.cliente_id.length > 0 &&
    data.vehiculo_id.length > 0;

export function OrdenFormModal({
    open,
    onOpenChange,
    orden,
    sedes,
    clientes,
    vehiculos,
    servicios = [],
    productos = [],
}: OrdenFormModalProps) {
    const isEdit = orden !== null;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<OrdenFormData>(emptyForm);

    const canSubmit = isFormValid(data) && !processing;
    const initialSnapshotRef = useRef<OrdenFormData>(emptyForm);

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(orden, sedes);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof OrdenFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, orden?.id]);

    const vehiculosFiltrados = useMemo(
        () => vehiculos.filter((v) => v.cliente_id === data.cliente_id),
        [vehiculos, data.cliente_id],
    );

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;

        return (Object.keys(initial) as Array<keyof OrdenFormData>).some((key) => {
            if (key === 'lineas') {
                return JSON.stringify(initial.lineas) !== JSON.stringify(data.lineas);
            }

            return initial[key] !== data[key];
        });
    }, [data]);

    const confirmDiscard = (): boolean => {
        if (!isDirty) {
            return true;
        }

        return window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');
    };

    const handleClose = (next: boolean) => {
        if (!next) {
            if (!confirmDiscard()) {
                return;
            }

            reset();
            clearErrors();
        }

        onOpenChange(next);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        if (isEdit && orden) {
            put(ordenesTrabajo.update(orden.id).url, {
                preserveScroll: true,
                onSuccess,
            });

            return;
        }

        post(ordenesTrabajo.store().url, {
            preserveScroll: true,
            onSuccess,
        });
    };

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

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? `Editar ${orden?.numero}` : 'Nueva orden de trabajo'}
            description={
                isEdit
                    ? 'Actualiza estado, diagnóstico y datos de ingreso.'
                    : 'El número OT-AAAA-NNNNN se asigna al guardar.'
            }
            size="xl"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        )}
                        {isEdit ? 'Guardar cambios' : 'Crear orden'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                {sedes.length === 0 && (
                    <p
                        className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        role="alert"
                    >
                        Primero crea una sede en Configuración → Sedes.
                    </p>
                )}

                <FormSection
                    index={0}
                    title="Cliente y vehículo"
                    description="La orden queda ligada a un vehículo del cliente."
                    columns={2}
                >
                    <FormField id="ot-sede" label="Sede" required error={errors.sede_id}>
                        <Select
                            value={data.sede_id || undefined}
                            onValueChange={(value) => setData('sede_id', value)}
                        >
                            <SelectTrigger id="ot-sede" className="w-full">
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

                    <FormField
                        id="ot-cliente"
                        label="Cliente"
                        required
                        error={errors.cliente_id}
                    >
                        <Select
                            value={data.cliente_id || undefined}
                            onValueChange={(value) => {
                                setData('cliente_id', value);
                                setData('vehiculo_id', '');
                            }}
                        >
                            <SelectTrigger id="ot-cliente" className="w-full">
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
                            disabled={!data.cliente_id}
                        >
                            <SelectTrigger id="ot-vehiculo" className="w-full">
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

                <FormSection index={1} title="Ingreso" columns={2}>
                    {isEdit && (
                        <FormField id="ot-estado" label="Estado" error={errors.estado}>
                            <Select
                                value={data.estado}
                                onValueChange={(value) =>
                                    setData('estado', value as OrdenEstado)
                                }
                            >
                                <SelectTrigger id="ot-estado" className="w-full">
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
                    )}

                    <FormField
                        id="ot-prometida"
                        label="Fecha prometida"
                        error={errors.prometida_at}
                    >
                        <Input
                            id="ot-prometida"
                            type="datetime-local"
                            value={data.prometida_at}
                            onChange={(e) => setData('prometida_at', e.target.value)}
                        />
                    </FormField>

                    <FormField
                        id="ot-km-ingreso"
                        label="Km de ingreso"
                        error={errors.km_ingreso}
                    >
                        <Input
                            id="ot-km-ingreso"
                            type="number"
                            min="0"
                            value={data.km_ingreso}
                            onChange={(e) => setData('km_ingreso', e.target.value)}
                        />
                    </FormField>

                    {isEdit && (
                        <FormField
                            id="ot-km-salida"
                            label="Km de salida"
                            error={errors.km_salida}
                        >
                            <Input
                                id="ot-km-salida"
                                type="number"
                                min="0"
                                value={data.km_salida}
                                onChange={(e) => setData('km_salida', e.target.value)}
                            />
                        </FormField>
                    )}

                    <FormField
                        id="ot-solicitud"
                        label="Solicitud del cliente"
                        error={errors.solicitud_cliente}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="ot-solicitud"
                            value={data.solicitud_cliente}
                            onChange={(e) =>
                                setData('solicitud_cliente', e.target.value)
                            }
                            rows={3}
                            placeholder="Ruido en el motor, cambio de aceite…"
                        />
                    </FormField>

                    {isEdit && (
                        <>
                            <FormField
                                id="ot-diagnostico"
                                label="Diagnóstico"
                                error={errors.diagnostico}
                                className="sm:col-span-2"
                            >
                                <Textarea
                                    id="ot-diagnostico"
                                    value={data.diagnostico}
                                    onChange={(e) =>
                                        setData('diagnostico', e.target.value)
                                    }
                                    rows={3}
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
                                    onChange={(e) =>
                                        setData('notas_internas', e.target.value)
                                    }
                                    rows={2}
                                />
                            </FormField>
                        </>
                    )}
                </FormSection>

                <FormSection
                    index={2}
                    title="Trabajos y repuestos"
                    description="Opcional. Al guardar se calcula el total de la orden."
                    columns={1}
                >
                    {data.lineas.map((linea, index) => (
                        <div key={index} className="grid gap-2 rounded-md border p-2">
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
                                    >
                                        <SelectTrigger id={`ot-linea-cat-${index}`}>
                                            <SelectValue placeholder="Libre / catálogo" />
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
                                        value={linea.descripcion}
                                        onChange={(e) =>
                                            setLinea(index, { descripcion: e.target.value })
                                        }
                                        placeholder="Mano de obra o pieza"
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
                                        value={linea.cantidad}
                                        onChange={(e) =>
                                            setLinea(index, { cantidad: e.target.value })
                                        }
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
                                        value={linea.precio_unitario}
                                        onChange={(e) =>
                                            setLinea(index, { precio_unitario: e.target.value })
                                        }
                                    />
                                </FormField>
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
            </div>
        </FormModal>
    );
}
