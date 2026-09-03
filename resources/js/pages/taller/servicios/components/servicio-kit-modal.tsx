import { useForm } from '@inertiajs/react';
import { Loader2, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import servicios from '@/routes/taller/servicios';
import type { ProductoOption, Servicio } from '../types';

type KitLineaForm = {
    producto_id: string;
    cantidad: string;
};

type FormData = {
    categoria_id: string;
    nombre: string;
    descripcion: string;
    precio: string;
    duracion_minutos: string;
    activo: boolean;
    kit: KitLineaForm[];
};

const emptyKitLinea = (): KitLineaForm => ({
    producto_id: '',
    cantidad: '1',
});

const formatQty = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
        return '1';
    }

    const n = Number(value);

    return Number.isFinite(n) && n > 0 ? String(n) : '1';
};

const isKitValid = (kit: readonly KitLineaForm[]): boolean =>
    kit.every(
        (linea) =>
            linea.producto_id !== '' &&
            Number(linea.cantidad) > 0 &&
            Number.isFinite(Number(linea.cantidad)),
    );

export function ServicioKitModal({
    open,
    onOpenChange,
    servicio,
    productos,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    servicio: Servicio | null;
    productos: readonly ProductoOption[];
}) {
    const { data, setData, put, processing, errors, clearErrors } = useForm<FormData>({
        categoria_id: '',
        nombre: '',
        descripcion: '',
        precio: '',
        duracion_minutos: '',
        activo: true,
        kit: [],
    });

    const canSubmit = Boolean(servicio) && isKitValid(data.kit) && !processing;

    const productoOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            productos.map((producto) => ({
                value: producto.id,
                label: producto.sku
                    ? `${producto.nombre} · ${producto.sku}`
                    : producto.nombre,
            })),
        [productos],
    );

    const productoById = useMemo(() => {
        const map = new Map<string, ProductoOption>();
        for (const producto of productos) {
            map.set(producto.id, producto);
        }

        return map;
    }, [productos]);

    useEffect(() => {
        if (!open || !servicio) {
            return;
        }

        clearErrors();
        setData({
            categoria_id: servicio.categoria_id ?? '',
            nombre: servicio.nombre,
            descripcion: servicio.descripcion ?? '',
            precio: servicio.precio != null ? String(servicio.precio) : '0',
            duracion_minutos:
                servicio.duracion_minutos != null ? String(servicio.duracion_minutos) : '',
            activo: servicio.activo,
            kit: (servicio.kit_items ?? []).map((item) => ({
                producto_id: item.producto_id,
                cantidad: formatQty(item.cantidad),
            })),
        });
    }, [open, servicio, clearErrors, setData]);

    const setKitLinea = (index: number, patch: Partial<KitLineaForm>) => {
        setData(
            'kit',
            data.kit.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
        );
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit || !servicio) {
            return;
        }

        put(servicios.update(servicio.id).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={servicio ? `Kit · ${servicio.nombre}` : 'Kit de repuestos'}
            description="Repuestos que se agregan solos al elegir este servicio en OT o cobro. Se descuentan del stock al vender."
            size="lg"
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
                        Guardar kit
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Repuestos del paquete" icon={PackagePlus} columns={1}>
                {data.kit.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-brand-200/80 bg-brand-50/40 px-4 py-5 text-center dark:border-brand-800/50 dark:bg-brand-950/20">
                        <p className="text-sm text-muted-foreground">
                            Sin repuestos. Agrega los del paquete (ej. aceite + filtro).
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {data.kit.map((linea, index) => {
                            const producto = productoById.get(linea.producto_id);
                            const usedIds = new Set(
                                data.kit
                                    .map((item, i) => (i === index ? '' : item.producto_id))
                                    .filter(Boolean),
                            );
                            const optionsForRow = productoOptions.filter(
                                (opt) => !usedIds.has(opt.value) || opt.value === linea.producto_id,
                            );

                            return (
                                <div
                                    key={`kit-${index}`}
                                    className="grid gap-3 rounded-lg border border-brand-200/60 bg-brand-50/30 p-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto] dark:border-brand-800/40 dark:bg-brand-950/15"
                                >
                                    <FormField
                                        id={`kit-prod-${index}`}
                                        label="Repuesto"
                                        error={errors[`kit.${index}.producto_id`]}
                                        className="min-w-0"
                                    >
                                        <Combobox
                                            id={`kit-prod-${index}`}
                                            options={optionsForRow}
                                            value={linea.producto_id || null}
                                            onChange={(value) =>
                                                setKitLinea(index, { producto_id: value ?? '' })
                                            }
                                            placeholder="Elegir repuesto"
                                            searchPlaceholder="Buscar repuesto…"
                                            emptyMessage="Sin coincidencias."
                                            clearable={false}
                                            disabled={processing}
                                            aria-invalid={Boolean(
                                                errors[`kit.${index}.producto_id`],
                                            )}
                                        />
                                        {producto?.unidad ? (
                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                                Unidad: {producto.unidad}
                                                {producto.precio_venta != null
                                                    ? ` · P. venta S/ ${Number(producto.precio_venta).toFixed(2)}`
                                                    : ''}
                                            </p>
                                        ) : null}
                                    </FormField>

                                    <FormField
                                        id={`kit-qty-${index}`}
                                        label="Cantidad"
                                        error={errors[`kit.${index}.cantidad`]}
                                        className="min-w-0"
                                    >
                                        <Input
                                            id={`kit-qty-${index}`}
                                            type="number"
                                            min="0.001"
                                            step="0.001"
                                            inputMode="decimal"
                                            value={linea.cantidad}
                                            onChange={(e) =>
                                                setKitLinea(index, { cantidad: e.target.value })
                                            }
                                            disabled={processing}
                                        />
                                    </FormField>

                                    <div className="flex items-end justify-end pb-0.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-9 cursor-pointer text-destructive hover:text-destructive"
                                            aria-label="Quitar del kit"
                                            onClick={() =>
                                                setData(
                                                    'kit',
                                                    data.kit.filter((_, i) => i !== index),
                                                )
                                            }
                                            disabled={processing}
                                        >
                                            <Trash2 className="size-4" strokeWidth={2.25} />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5 self-start border-brand-300/70 text-brand-800 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-200 dark:hover:bg-brand-950/40"
                    onClick={() => setData('kit', [...data.kit, emptyKitLinea()])}
                    disabled={processing || productos.length === 0}
                >
                    <Plus className="size-3.5" />
                    Agregar repuesto
                </Button>

                {productos.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                        No hay repuestos activos. Créalos en Inventario para armar kits.
                    </p>
                )}

                {errors.kit && <p className="text-sm text-destructive">{errors.kit}</p>}
            </FormSection>
        </FormModal>
    );
}
