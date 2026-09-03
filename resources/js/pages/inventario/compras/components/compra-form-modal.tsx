import { useForm } from '@inertiajs/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import compras from '@/routes/inventario/compras';
import type {
    CompraTipoComprobante,
    ProductoOption,
    ProveedorOption,
    SedeOption,
    UnidadOption,
} from '../types';

type LineaModo = 'existente' | 'nuevo';

type LineaForm = {
    modo: LineaModo;
    producto_id: string;
    nuevo_nombre: string;
    nuevo_unidad: string;
    cantidad: string;
    costo_unitario: string;
};

type FormData = {
    proveedor_id: string;
    sede_id: string;
    tipo_comprobante: CompraTipoComprobante;
    serie: string;
    numero_documento: string;
    fecha_documento: string;
    notas: string;
    factura: File | null;
    lineas: LineaForm[];
};

/** Fecha de hoy en zona horaria de Perú (America/Lima), formato YYYY-MM-DD. */
const todayPeru = (): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

const TIPO_OPTIONS: ComboboxOption[] = [
    { value: 'boleta', label: 'Boleta' },
    { value: 'factura', label: 'Factura' },
];

const MODO_OPTIONS: ComboboxOption[] = [
    { value: 'existente', label: 'Repuesto existente' },
    { value: 'nuevo', label: 'Repuesto nuevo' },
];

const emptyLinea = (unidadDefault: string): LineaForm => ({
    modo: 'existente',
    producto_id: '',
    nuevo_nombre: '',
    nuevo_unidad: unidadDefault,
    cantidad: '1',
    costo_unitario: '',
});

const isLineaValid = (linea: LineaForm): boolean => {
    if (Number(linea.cantidad) <= 0) {
        return false;
    }

    return linea.modo === 'existente'
        ? linea.producto_id !== ''
        : linea.nuevo_nombre.trim() !== '';
};

const isFormValid = (data: FormData): boolean =>
    data.sede_id !== '' &&
    data.fecha_documento !== '' &&
    data.lineas.length > 0 &&
    data.lineas.every(isLineaValid);

export function CompraFormModal({
    open,
    onOpenChange,
    proveedores,
    sedes,
    productos,
    unidades,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proveedores: readonly ProveedorOption[];
    sedes: readonly SedeOption[];
    productos: readonly ProductoOption[];
    unidades: readonly UnidadOption[];
}) {
    const unidadDefault = unidades[0]?.codigo ?? 'UN';

    const { data, setData, post, processing, errors, reset, clearErrors, transform } =
        useForm<FormData>({
            proveedor_id: '',
            sede_id: '',
            tipo_comprobante: 'boleta',
            serie: '',
            numero_documento: '',
            fecha_documento: todayPeru(),
            notas: '',
            factura: null,
            lineas: [emptyLinea(unidadDefault)],
        });

    const canSubmit = isFormValid(data) && !processing;

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            proveedor_id: '',
            sede_id: sedes.length === 1 ? sedes[0].id : '',
            tipo_comprobante: 'boleta',
            serie: '',
            numero_documento: '',
            fecha_documento: todayPeru(),
            notas: '',
            factura: null,
            lineas: [emptyLinea(unidadDefault)],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const proveedorOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            proveedores.map((p) => ({
                value: p.id,
                label: `${p.razon_social} (${p.ruc})`,
            })),
        [proveedores],
    );

    const sedeOptions = useMemo<readonly ComboboxOption[]>(
        () => sedes.map((s) => ({ value: s.id, label: s.nombre })),
        [sedes],
    );

    const productoOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            productos.map((p) => ({
                value: p.id,
                label: p.sku ? `${p.nombre} (${p.sku})` : p.nombre,
            })),
        [productos],
    );

    const unidadOptions = useMemo<readonly ComboboxOption[]>(
        () => unidades.map((u) => ({ value: u.codigo, label: `${u.codigo} — ${u.nombre}` })),
        [unidades],
    );

    const setLinea = (index: number, patch: Partial<LineaForm>) => {
        setData(
            'lineas',
            data.lineas.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
        );
    };

    const totalEstimado = useMemo(
        () =>
            data.lineas.reduce((sum, l) => {
                const cantidad = Number(l.cantidad) || 0;
                const costo = Number(l.costo_unitario) || 0;

                return sum + cantidad * costo;
            }, 0),
        [data.lineas],
    );

    useEffect(() => {
        transform((raw) => ({
            proveedor_id: raw.proveedor_id || null,
            sede_id: raw.sede_id,
            tipo_comprobante: raw.tipo_comprobante,
            serie: raw.serie.trim() || null,
            numero_documento: raw.numero_documento.trim() || null,
            fecha_documento: raw.fecha_documento,
            notas: raw.notas.trim() || null,
            factura: raw.factura instanceof File ? raw.factura : undefined,
            lineas: raw.lineas.map((l) =>
                l.modo === 'existente'
                    ? {
                          producto_id: l.producto_id,
                          nuevo_producto: null,
                          cantidad: l.cantidad,
                          costo_unitario: l.costo_unitario.trim() || null,
                      }
                    : {
                          producto_id: null,
                          nuevo_producto: { nombre: l.nuevo_nombre, unidad: l.nuevo_unidad },
                          cantidad: l.cantidad,
                          costo_unitario: l.costo_unitario.trim() || null,
                      },
            ),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        post(compras.store().url, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                reset();
                clearErrors();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Nueva compra"
            description="Registra el comprobante del proveedor: el stock se actualiza automáticamente."
            size="xl"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Registrar compra
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection index={0} title="Comprobante" columns={2}>
                    <FormField
                        id="compra-proveedor"
                        label="Proveedor"
                        error={errors.proveedor_id}
                        className="min-w-0 sm:col-span-2"
                    >
                        <Combobox
                            id="compra-proveedor"
                            options={proveedorOptions}
                            value={data.proveedor_id || null}
                            onChange={(value) => setData('proveedor_id', value ?? '')}
                            placeholder="Sin proveedor"
                            searchPlaceholder="Buscar proveedor…"
                            emptyMessage="Sin coincidencias."
                            clearable
                            disabled={processing}
                            aria-invalid={Boolean(errors.proveedor_id)}
                        />
                    </FormField>

                    <FormField
                        id="compra-sede"
                        label="Sede"
                        required
                        error={errors.sede_id}
                        className="min-w-0"
                    >
                        <Combobox
                            id="compra-sede"
                            options={sedeOptions}
                            value={data.sede_id || null}
                            onChange={(value) => setData('sede_id', value ?? '')}
                            placeholder="Selecciona sede"
                            searchPlaceholder="Buscar sede…"
                            emptyMessage="Sin coincidencias."
                            clearable={false}
                            disabled={processing}
                            aria-invalid={Boolean(errors.sede_id)}
                        />
                    </FormField>

                    <FormField
                        id="compra-tipo"
                        label="Tipo de comprobante"
                        required
                        error={errors.tipo_comprobante}
                        className="min-w-0"
                    >
                        <Combobox
                            id="compra-tipo"
                            options={TIPO_OPTIONS}
                            value={data.tipo_comprobante}
                            onChange={(value) =>
                                setData(
                                    'tipo_comprobante',
                                    (value as CompraTipoComprobante) ?? 'boleta',
                                )
                            }
                            placeholder="Tipo"
                            searchPlaceholder="Buscar…"
                            emptyMessage="Sin coincidencias."
                            clearable={false}
                            disabled={processing}
                            aria-invalid={Boolean(errors.tipo_comprobante)}
                        />
                    </FormField>

                    <FormField
                        id="compra-serie"
                        label="Serie"
                        error={errors.serie}
                        className="min-w-0"
                    >
                        <Input
                            id="compra-serie"
                            value={data.serie}
                            onChange={(e) => setData('serie', e.target.value)}
                            placeholder="F001"
                            disabled={processing}
                        />
                    </FormField>

                    <FormField
                        id="compra-numero"
                        label="Número"
                        error={errors.numero_documento}
                        className="min-w-0"
                    >
                        <Input
                            id="compra-numero"
                            value={data.numero_documento}
                            onChange={(e) => setData('numero_documento', e.target.value)}
                            placeholder="000123"
                            disabled={processing}
                        />
                    </FormField>

                    <FormField
                        id="compra-fecha"
                        label="Fecha del documento"
                        required
                        error={errors.fecha_documento}
                        className="min-w-0"
                    >
                        <Input
                            id="compra-fecha"
                            type="date"
                            value={data.fecha_documento}
                            onChange={(e) => setData('fecha_documento', e.target.value)}
                            disabled={processing}
                        />
                    </FormField>

                    <FormField
                        id="compra-factura"
                        label="Comprobante (PDF/imagen)"
                        error={errors.factura}
                        className="min-w-0"
                        hint="Opcional. PDF, JPG o PNG, máx. 10 MB."
                    >
                        <Input
                            id="compra-factura"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setData('factura', e.target.files?.[0] ?? null)}
                            disabled={processing}
                            className="cursor-pointer file:mr-3 file:cursor-pointer"
                        />
                    </FormField>

                    <FormField
                        id="compra-notas"
                        label="Notas"
                        error={errors.notas}
                        className="min-w-0 sm:col-span-2"
                    >
                        <Textarea
                            id="compra-notas"
                            value={data.notas}
                            onChange={(e) => setData('notas', e.target.value)}
                            rows={2}
                            disabled={processing}
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title="Líneas de la compra"
                    description="Cada línea genera una entrada de stock en la sede seleccionada."
                    columns={1}
                >
                    {data.lineas.map((linea, index) => (
                        <div
                            key={index}
                            className="grid gap-3 rounded-md border border-border/70 p-3 sm:grid-cols-2"
                        >
                            <FormField
                                id={`compra-linea-modo-${index}`}
                                label="Tipo de línea"
                                className="min-w-0"
                            >
                                <div className="flex items-center gap-2">
                                    <Combobox
                                        id={`compra-linea-modo-${index}`}
                                        options={MODO_OPTIONS}
                                        value={linea.modo}
                                        onChange={(value) =>
                                            setLinea(index, {
                                                modo: (value as LineaModo) ?? 'existente',
                                            })
                                        }
                                        placeholder="Tipo"
                                        searchPlaceholder="Buscar…"
                                        emptyMessage="Sin coincidencias."
                                        clearable={false}
                                        disabled={processing}
                                        className="min-w-0 flex-1"
                                    />
                                    {data.lineas.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-9 shrink-0 cursor-pointer text-destructive"
                                            onClick={() =>
                                                setData(
                                                    'lineas',
                                                    data.lineas.filter((_, i) => i !== index),
                                                )
                                            }
                                            disabled={processing}
                                            aria-label="Quitar línea"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </FormField>

                            {linea.modo === 'existente' ? (
                                <FormField
                                    id={`compra-linea-producto-${index}`}
                                    label="Repuesto"
                                    className="min-w-0"
                                >
                                    <Combobox
                                        id={`compra-linea-producto-${index}`}
                                        options={productoOptions}
                                        value={linea.producto_id || null}
                                        onChange={(value) =>
                                            setLinea(index, { producto_id: value ?? '' })
                                        }
                                        placeholder="Elegir repuesto"
                                        searchPlaceholder="Buscar repuesto…"
                                        emptyMessage="Sin coincidencias."
                                        clearable={false}
                                        disabled={processing}
                                        aria-invalid={Boolean(errors.lineas)}
                                    />
                                </FormField>
                            ) : (
                                <FormField
                                    id={`compra-linea-nuevo-nombre-${index}`}
                                    label="Nombre del repuesto"
                                    className="min-w-0"
                                >
                                    <Input
                                        id={`compra-linea-nuevo-nombre-${index}`}
                                        value={linea.nuevo_nombre}
                                        onChange={(e) =>
                                            setLinea(index, { nuevo_nombre: e.target.value })
                                        }
                                        placeholder="Nombre del repuesto nuevo"
                                        disabled={processing}
                                    />
                                </FormField>
                            )}

                            {linea.modo === 'nuevo' && (
                                <FormField
                                    id={`compra-linea-unidad-${index}`}
                                    label="Unidad"
                                    className="min-w-0"
                                >
                                    <Combobox
                                        id={`compra-linea-unidad-${index}`}
                                        options={unidadOptions}
                                        value={linea.nuevo_unidad || null}
                                        onChange={(value) =>
                                            setLinea(index, {
                                                nuevo_unidad: value ?? unidadDefault,
                                            })
                                        }
                                        placeholder="Unidad"
                                        searchPlaceholder="Buscar unidad…"
                                        emptyMessage="Sin coincidencias."
                                        clearable={false}
                                        disabled={processing}
                                    />
                                </FormField>
                            )}

                            <FormField
                                id={`compra-linea-cantidad-${index}`}
                                label="Cantidad"
                                className="min-w-0"
                            >
                                <Input
                                    id={`compra-linea-cantidad-${index}`}
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    inputMode="decimal"
                                    value={linea.cantidad}
                                    onChange={(e) =>
                                        setLinea(index, { cantidad: e.target.value })
                                    }
                                    disabled={processing}
                                />
                            </FormField>

                            <FormField
                                id={`compra-linea-costo-${index}`}
                                label="Costo unitario"
                                className="min-w-0"
                            >
                                <Input
                                    id={`compra-linea-costo-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={linea.costo_unitario}
                                    onChange={(e) =>
                                        setLinea(index, { costo_unitario: e.target.value })
                                    }
                                    disabled={processing}
                                />
                            </FormField>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5 self-start"
                        onClick={() =>
                            setData('lineas', [...data.lineas, emptyLinea(unidadDefault)])
                        }
                        disabled={processing}
                    >
                        <Plus className="size-3.5" />
                        Agregar línea
                    </Button>

                    {errors.lineas && <p className="text-sm text-destructive">{errors.lineas}</p>}

                    <div className="flex justify-end pt-1 text-sm text-muted-foreground">
                        Total estimado:{' '}
                        <span className="ml-1 font-medium text-foreground">
                            {totalEstimado.toLocaleString('es-PE', {
                                style: 'currency',
                                currency: 'PEN',
                            })}
                        </span>
                    </div>
                </FormSection>
            </div>
        </FormModal>
    );
}
