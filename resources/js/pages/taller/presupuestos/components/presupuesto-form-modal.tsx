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
import presupuestos from '@/routes/taller/presupuestos';
import type {
    ClienteOption,
    OrdenOption,
    Presupuesto,
    PresupuestoItem,
    ProductoCobroOption,
    SedeOption,
    ServicioCobroOption,
    VehiculoOption,
} from '../types';

type LineaForm = {
    servicio_id: string;
    producto_id: string;
    descripcion: string;
    cantidad: string;
    precio_unitario: string;
};

type FormData = {
    sede_id: string;
    cliente_id: string;
    vehiculo_id: string;
    orden_trabajo_id: string;
    valido_hasta: string;
    diagnostico: string;
    notas_internas: string;
    lineas: LineaForm[];
};

const LIBRE = '__libre__';
const NONE = '__none__';

const emptyLinea = (): LineaForm => ({
    servicio_id: '',
    producto_id: '',
    descripcion: '',
    cantidad: '1',
    precio_unitario: '',
});

const defaultValidoHasta = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 7);

    return date.toISOString().slice(0, 10);
};

const toLineas = (items: readonly PresupuestoItem[] | undefined): LineaForm[] =>
    (items ?? []).map((item) => ({
        servicio_id: item.servicio_id ?? '',
        producto_id: item.producto_id ?? '',
        descripcion: item.descripcion,
        cantidad: String(item.cantidad ?? 1),
        precio_unitario: String(item.precio_unitario ?? ''),
    }));

const catalogValue = (linea: LineaForm): string => {
    if (linea.servicio_id) {
        return `s:${linea.servicio_id}`;
    }

    if (linea.producto_id) {
        return `p:${linea.producto_id}`;
    }

    return LIBRE;
};

export function PresupuestoFormModal({
    open,
    onOpenChange,
    presupuesto,
    sedes,
    clientes,
    vehiculos,
    ordenes,
    servicios = [],
    productos = [],
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    presupuesto: Presupuesto | null;
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    ordenes: readonly OrdenOption[];
    servicios?: readonly ServicioCobroOption[];
    productos?: readonly ProductoCobroOption[];
}) {
    const isEdit = presupuesto !== null;
    const emptyForm: FormData = {
        sede_id: '',
        cliente_id: '',
        vehiculo_id: '',
        orden_trabajo_id: '',
        valido_hasta: defaultValidoHasta(),
        diagnostico: '',
        notas_internas: '',
        lineas: [],
    };

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>(emptyForm);
    const initialSnapshotRef = useRef<FormData>(emptyForm);

    useEffect(() => {
        if (!open) {
            return;
        }

        const initial: FormData = {
            sede_id: presupuesto?.sede_id ?? (sedes.length === 1 ? sedes[0].id : ''),
            cliente_id: presupuesto?.cliente_id ?? '',
            vehiculo_id: presupuesto?.vehiculo_id ?? '',
            orden_trabajo_id: presupuesto?.orden_trabajo_id ?? '',
            valido_hasta: presupuesto?.valido_hasta ?? defaultValidoHasta(),
            diagnostico: presupuesto?.diagnostico ?? '',
            notas_internas: presupuesto?.notas_internas ?? '',
            lineas: toLineas(presupuesto?.items),
        };

        initialSnapshotRef.current = initial;
        (Object.keys(initial) as Array<keyof FormData>).forEach((key) => {
            setData(key, initial[key]);
        });
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, presupuesto?.id]);

    const vehiculosFiltrados = useMemo(
        () => vehiculos.filter((v) => v.cliente_id === data.cliente_id),
        [vehiculos, data.cliente_id],
    );

    const onOrdenChange = (ordenId: string) => {
        if (ordenId === NONE) {
            setData('orden_trabajo_id', '');

            return;
        }

        const orden = ordenes.find((item) => item.id === ordenId);
        setData('orden_trabajo_id', ordenId);

        if (orden) {
            setData('sede_id', orden.sede_id);
            setData('cliente_id', orden.cliente_id);
            setData('vehiculo_id', orden.vehiculo_id);
        }
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
                        : (data.lineas[index]?.precio_unitario ?? ''),
            });
        }
    };

    const transformPayload = (formData: FormData) => ({
        ...formData,
        orden_trabajo_id: formData.orden_trabajo_id || null,
    });

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        if (isEdit && presupuesto) {
            put(presupuestos.update(presupuesto.id).url, {
                preserveScroll: true,
                onSuccess,
                transform: transformPayload,
            });

            return;
        }

        post(presupuestos.store().url, {
            preserveScroll: true,
            onSuccess,
            transform: transformPayload,
        });
    };

    const canSubmit =
        data.sede_id !== '' && data.cliente_id !== '' && data.vehiculo_id !== '' && !processing;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? `Editar ${presupuesto?.numero}` : 'Nuevo presupuesto'}
            description="El cliente podrá aprobar o rechazar desde el enlace que envíes por WhatsApp."
            size="xl"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={!canSubmit} className="gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection index={0} title="Cliente y vehículo" columns={2}>
                    <FormField id="pre-orden" label="Orden de trabajo (opcional)" className="sm:col-span-2">
                        <Select
                            value={data.orden_trabajo_id || NONE}
                            onValueChange={onOrdenChange}
                            disabled={isEdit && presupuesto?.orden_trabajo_id !== null}
                        >
                            <SelectTrigger id="pre-orden">
                                <SelectValue placeholder="Sin OT vinculada" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Sin OT vinculada</SelectItem>
                                {ordenes.map((orden) => (
                                    <SelectItem key={orden.id} value={orden.id}>
                                        {orden.numero}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="pre-sede" label="Sede" required error={errors.sede_id}>
                        <Select value={data.sede_id} onValueChange={(value) => setData('sede_id', value)}>
                            <SelectTrigger id="pre-sede">
                                <SelectValue placeholder="Selecciona sede" />
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
                    <FormField id="pre-valido" label="Válido hasta" error={errors.valido_hasta}>
                        <Input
                            id="pre-valido"
                            type="date"
                            value={data.valido_hasta}
                            onChange={(e) => setData('valido_hasta', e.target.value)}
                        />
                    </FormField>
                    <FormField id="pre-cliente" label="Cliente" required error={errors.cliente_id}>
                        <Select
                            value={data.cliente_id}
                            onValueChange={(value) => {
                                setData('cliente_id', value);
                                setData('vehiculo_id', '');
                            }}
                        >
                            <SelectTrigger id="pre-cliente">
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
                    <FormField id="pre-vehiculo" label="Vehículo" required error={errors.vehiculo_id}>
                        <Select
                            value={data.vehiculo_id}
                            onValueChange={(value) => setData('vehiculo_id', value)}
                            disabled={data.cliente_id === ''}
                        >
                            <SelectTrigger id="pre-vehiculo">
                                <SelectValue placeholder="Selecciona vehículo" />
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

                <FormSection index={1} title="Detalle" columns={1}>
                    <FormField id="pre-diagnostico" label="Diagnóstico / alcance" error={errors.diagnostico}>
                        <Textarea
                            id="pre-diagnostico"
                            value={data.diagnostico}
                            onChange={(e) => setData('diagnostico', e.target.value)}
                            rows={3}
                        />
                    </FormField>
                    <FormField id="pre-notas" label="Notas internas" error={errors.notas_internas}>
                        <Textarea
                            id="pre-notas"
                            value={data.notas_internas}
                            onChange={(e) => setData('notas_internas', e.target.value)}
                            rows={2}
                        />
                    </FormField>
                </FormSection>

                <FormSection index={2} title="Líneas del presupuesto" columns={1}>
                    {data.lineas.map((linea, index) => (
                        <div key={index} className="grid gap-2 rounded-md border p-2">
                            {(servicios.length > 0 || productos.length > 0) && (
                                <Select value={catalogValue(linea)} onValueChange={(value) => applyCatalog(index, value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Catálogo" />
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
                            )}
                            <div className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
                                <Input
                                    value={linea.descripcion}
                                    onChange={(e) => setLinea(index, { descripcion: e.target.value })}
                                    placeholder="Descripción"
                                />
                                <Input
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    value={linea.cantidad}
                                    onChange={(e) => setLinea(index, { cantidad: e.target.value })}
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={linea.precio_unitario}
                                    onChange={(e) => setLinea(index, { precio_unitario: e.target.value })}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
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
                        className="gap-1.5 self-start"
                        onClick={() => setData('lineas', [...data.lineas, emptyLinea()])}
                    >
                        <Plus className="size-3.5" />
                        Agregar línea
                    </Button>
                    {errors.lineas && <p className="text-sm text-destructive">{errors.lineas}</p>}
                </FormSection>
            </div>
        </FormModal>
    );
}
