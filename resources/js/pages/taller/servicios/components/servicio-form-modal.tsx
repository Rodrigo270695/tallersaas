import { useForm } from '@inertiajs/react';
import { Loader2, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import servicios from '@/routes/taller/servicios';
import type { CategoriaOption, ProductoOption, Servicio } from '../types';

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

export function ServicioFormModal({
    open,
    onOpenChange,
    servicio,
    categorias,
    productos,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    servicio: Servicio | null;
    categorias: readonly CategoriaOption[];
    productos: readonly ProductoOption[];
}) {
    const isEdit = servicio !== null;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm<FormData>({
        categoria_id: '',
        nombre: '',
        descripcion: '',
        precio: '',
        duracion_minutos: '',
        activo: true,
        kit: [],
    });

    const categoriaOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            categorias.map((cat) => ({
                value: cat.id,
                label: cat.nombre,
            })),
        [categorias],
    );

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
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            categoria_id: servicio?.categoria_id ?? '',
            nombre: servicio?.nombre ?? '',
            descripcion: servicio?.descripcion ?? '',
            precio: servicio?.precio != null ? String(servicio.precio) : '',
            duracion_minutos:
                servicio?.duracion_minutos != null ? String(servicio.duracion_minutos) : '',
            activo: servicio?.activo ?? true,
            kit: (servicio?.kit_items ?? []).map((item) => ({
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
        const opts = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit && servicio) {
            put(servicios.update(servicio.id).url, opts);

            return;
        }

        post(servicios.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
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
                    <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar' : 'Crear'}
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Datos" columns={2}>
                <FormField
                    id="s-nombre"
                    label="Nombre"
                    required
                    error={errors.nombre}
                    className="min-w-0 sm:col-span-2"
                >
                    <Input
                        id="s-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoFocus
                        disabled={processing}
                    />
                </FormField>

                <FormField
                    id="s-cat"
                    label="Categoría"
                    error={errors.categoria_id}
                    className="min-w-0"
                >
                    <Combobox
                        id="s-cat"
                        options={categoriaOptions}
                        value={data.categoria_id || null}
                        onChange={(value) => setData('categoria_id', value ?? '')}
                        placeholder="Sin categoría"
                        searchPlaceholder="Buscar categoría…"
                        emptyMessage="Sin coincidencias."
                        clearable
                        disabled={processing}
                        aria-invalid={Boolean(errors.categoria_id)}
                    />
                </FormField>

                <FormField
                    id="s-precio"
                    label="Precio (mano de obra)"
                    required
                    error={errors.precio}
                    className="min-w-0"
                >
                    <Input
                        id="s-precio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio}
                        onChange={(e) => setData('precio', e.target.value)}
                        disabled={processing}
                    />
                </FormField>

                <FormField
                    id="s-dur"
                    label="Duración (minutos)"
                    error={errors.duracion_minutos}
                    className="min-w-0"
                >
                    <Input
                        id="s-dur"
                        type="number"
                        min="1"
                        step="1"
                        value={data.duracion_minutos}
                        onChange={(e) => setData('duracion_minutos', e.target.value)}
                        disabled={processing}
                    />
                </FormField>

                <FormField id="s-activo" label="Estado" className="min-w-0">
                    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3">
                        <Checkbox
                            checked={data.activo}
                            onCheckedChange={(checked) => setData('activo', checked === true)}
                            disabled={processing}
                        />
                        <span className="text-sm">Servicio activo</span>
                    </label>
                </FormField>

                <FormField
                    id="s-desc"
                    label="Descripción"
                    error={errors.descripcion}
                    className="min-w-0 sm:col-span-2"
                >
                    <Textarea
                        id="s-desc"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        rows={2}
                        disabled={processing}
                    />
                </FormField>
            </FormSection>

            <FormSection
                index={1}
                title="Kit de repuestos"
                description="Opcional. Al elegir este servicio en una OT o cobro se agregan estos productos automáticamente y se descuentan del stock al vender."
                icon={PackagePlus}
                columns={1}
            >
                {data.kit.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-brand-200/80 bg-brand-50/40 px-4 py-5 text-center dark:border-brand-800/50 dark:bg-brand-950/20">
                        <p className="text-sm text-muted-foreground">
                            Sin repuestos prearmados. Útil para paquetes fijos (ej. cambio de aceite).
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
                                        id={`s-kit-prod-${index}`}
                                        label="Repuesto"
                                        error={errors[`kit.${index}.producto_id`]}
                                        className="min-w-0"
                                    >
                                        <Combobox
                                            id={`s-kit-prod-${index}`}
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
                                            aria-invalid={Boolean(errors[`kit.${index}.producto_id`])}
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
                                        id={`s-kit-qty-${index}`}
                                        label="Cantidad"
                                        error={errors[`kit.${index}.cantidad`]}
                                        className="min-w-0"
                                    >
                                        <Input
                                            id={`s-kit-qty-${index}`}
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
                    Agregar repuesto al kit
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
