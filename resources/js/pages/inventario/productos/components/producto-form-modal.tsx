import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import productos from '@/routes/inventario/productos';
import type { Producto, ProductoOption, SedeOption } from '../types';

type FormData = {
    categoria_id: string;
    nombre: string;
    descripcion: string;
    sku: string;
    codigo_barras: string;
    unidad: string;
    precio_venta: string;
    precio_compra: string;
    stock_minimo: string;
    activo: boolean;
    stock_inicial_sede_id: string;
    stock_inicial_cantidad: string;
};

const isFormValid = (data: FormData): boolean => data.nombre.trim().length > 0;

export function ProductoFormModal({
    open,
    onOpenChange,
    producto,
    categorias,
    unidades,
    sedes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    producto: Producto | null;
    categorias: readonly ProductoOption[];
    unidades: readonly string[];
    sedes: readonly SedeOption[];
}) {
    const isEdit = producto !== null;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm<FormData>({
        categoria_id: '',
        nombre: '',
        descripcion: '',
        sku: '',
        codigo_barras: '',
        unidad: 'UN',
        precio_venta: '',
        precio_compra: '',
        stock_minimo: '',
        activo: true,
        stock_inicial_sede_id: '',
        stock_inicial_cantidad: '',
    });

    const canSubmit = isFormValid(data) && !processing;

    const categoriaOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            categorias.map((cat) => ({
                value: cat.id,
                label: cat.nombre,
            })),
        [categorias],
    );

    const unidadOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            unidades.map((unidad) => ({
                value: unidad,
                label: unidad,
            })),
        [unidades],
    );

    const sedeOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            sedes.map((sede) => ({
                value: sede.id,
                label: sede.nombre,
            })),
        [sedes],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            categoria_id: producto?.categoria_id ?? '',
            nombre: producto?.nombre ?? '',
            descripcion: producto?.descripcion ?? '',
            sku: producto?.sku ?? '',
            codigo_barras: producto?.codigo_barras ?? '',
            unidad: producto?.unidad ?? 'UN',
            precio_venta: producto?.precio_venta != null ? String(producto.precio_venta) : '',
            precio_compra: producto?.precio_compra != null ? String(producto.precio_compra) : '',
            stock_minimo: producto?.stock_minimo != null ? String(producto.stock_minimo) : '',
            activo: producto?.activo ?? true,
            stock_inicial_sede_id: sedes[0]?.id ?? '',
            stock_inicial_cantidad: '',
        });
    }, [open, producto, sedes, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const opts = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit && producto) {
            put(productos.update(producto.id).url, opts);

            return;
        }

        post(productos.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar repuesto' : 'Nuevo repuesto'}
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
                        {isEdit ? 'Guardar' : 'Crear'}
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Datos" columns={2}>
                <FormField
                    id="p-nombre"
                    label="Nombre"
                    required
                    error={errors.nombre}
                    className="min-w-0 sm:col-span-2"
                >
                    <Input
                        id="p-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoFocus
                    />
                </FormField>

                <FormField
                    id="p-cat"
                    label="Categoría"
                    error={errors.categoria_id}
                    className="min-w-0"
                >
                    <Combobox
                        id="p-cat"
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
                    id="p-unidad"
                    label="Unidad"
                    required
                    error={errors.unidad}
                    className="min-w-0"
                >
                    <Combobox
                        id="p-unidad"
                        options={unidadOptions}
                        value={data.unidad || null}
                        onChange={(value) => setData('unidad', value ?? 'UN')}
                        placeholder="Selecciona unidad"
                        searchPlaceholder="Buscar unidad…"
                        emptyMessage="Sin coincidencias."
                        clearable={false}
                        disabled={processing}
                        aria-invalid={Boolean(errors.unidad)}
                    />
                </FormField>

                <FormField id="p-sku" label="SKU" error={errors.sku} className="min-w-0">
                    <Input
                        id="p-sku"
                        value={data.sku}
                        onChange={(e) => setData('sku', e.target.value)}
                    />
                </FormField>

                <FormField
                    id="p-barras"
                    label="Código de barras"
                    error={errors.codigo_barras}
                    className="min-w-0"
                >
                    <Input
                        id="p-barras"
                        value={data.codigo_barras}
                        onChange={(e) => setData('codigo_barras', e.target.value)}
                    />
                </FormField>

                <FormField
                    id="p-pv"
                    label="Precio de venta"
                    error={errors.precio_venta}
                    className="min-w-0"
                >
                    <Input
                        id="p-pv"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={data.precio_venta}
                        onChange={(e) => setData('precio_venta', e.target.value)}
                    />
                </FormField>

                <FormField
                    id="p-pc"
                    label="Precio de compra"
                    error={errors.precio_compra}
                    className="min-w-0"
                >
                    <Input
                        id="p-pc"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={data.precio_compra}
                        onChange={(e) => setData('precio_compra', e.target.value)}
                    />
                </FormField>

                <FormField
                    id="p-desc"
                    label="Descripción"
                    error={errors.descripcion}
                    className="min-w-0 sm:col-span-2"
                >
                    <Textarea
                        id="p-desc"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        rows={2}
                    />
                </FormField>

                {!isEdit && sedes.length > 0 && (
                    <>
                        <FormField
                            id="p-stock-sede"
                            label="Sede (stock inicial)"
                            error={errors.stock_inicial_sede_id}
                            className="min-w-0"
                        >
                            <Combobox
                                id="p-stock-sede"
                                options={sedeOptions}
                                value={data.stock_inicial_sede_id || null}
                                onChange={(value) =>
                                    setData('stock_inicial_sede_id', value ?? '')
                                }
                                placeholder="Selecciona sede"
                                searchPlaceholder="Buscar sede…"
                                emptyMessage="Sin coincidencias."
                                clearable={false}
                                disabled={processing}
                                aria-invalid={Boolean(errors.stock_inicial_sede_id)}
                            />
                        </FormField>

                        <FormField
                            id="p-stock-qty"
                            label="Cantidad inicial"
                            error={errors.stock_inicial_cantidad}
                            className="min-w-0"
                        >
                            <Input
                                id="p-stock-qty"
                                type="number"
                                min="0.001"
                                step="0.001"
                                inputMode="decimal"
                                value={data.stock_inicial_cantidad}
                                onChange={(e) =>
                                    setData('stock_inicial_cantidad', e.target.value)
                                }
                            />
                        </FormField>
                    </>
                )}

                <FormField
                    id="p-alerta"
                    label="Stock de alerta"
                    error={errors.stock_minimo}
                    hint="Si el stock baja de esta cantidad, en Stock se marca en amarillo o rojo."
                    className="min-w-0 sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]"
                >
                    <Input
                        id="p-alerta"
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        value={data.stock_minimo}
                        onChange={(e) => setData('stock_minimo', e.target.value)}
                        placeholder="Ej. 5"
                    />
                </FormField>

                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                    <Checkbox
                        checked={data.activo}
                        onCheckedChange={(checked) => setData('activo', checked === true)}
                    />
                    <span className="text-sm">Repuesto activo</span>
                </label>
            </FormSection>
        </FormModal>
    );
}
