import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

const NONE = '__none__';

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
                    id="p-nombre"
                    label="Nombre"
                    required
                    error={errors.nombre}
                    className="sm:col-span-2"
                >
                    <Input
                        id="p-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoFocus
                    />
                </FormField>
                <FormField id="p-cat" label="Categoría" error={errors.categoria_id}>
                    <Select
                        value={data.categoria_id || NONE}
                        onValueChange={(value) =>
                            setData('categoria_id', value === NONE ? '' : value)
                        }
                    >
                        <SelectTrigger id="p-cat">
                            <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE}>Sin categoría</SelectItem>
                            {categorias.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="p-unidad" label="Unidad" required error={errors.unidad}>
                    <Select value={data.unidad} onValueChange={(value) => setData('unidad', value)}>
                        <SelectTrigger id="p-unidad">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {unidades.map((unidad) => (
                                <SelectItem key={unidad} value={unidad}>
                                    {unidad}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="p-sku" label="SKU" error={errors.sku}>
                    <Input id="p-sku" value={data.sku} onChange={(e) => setData('sku', e.target.value)} />
                </FormField>
                <FormField id="p-barras" label="Código de barras" error={errors.codigo_barras}>
                    <Input
                        id="p-barras"
                        value={data.codigo_barras}
                        onChange={(e) => setData('codigo_barras', e.target.value)}
                    />
                </FormField>
                <FormField id="p-pv" label="Precio de venta" error={errors.precio_venta}>
                    <Input
                        id="p-pv"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio_venta}
                        onChange={(e) => setData('precio_venta', e.target.value)}
                    />
                </FormField>
                <FormField id="p-pc" label="Precio de compra" error={errors.precio_compra}>
                    <Input
                        id="p-pc"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio_compra}
                        onChange={(e) => setData('precio_compra', e.target.value)}
                    />
                </FormField>
                <FormField id="p-min" label="Stock mínimo" error={errors.stock_minimo}>
                    <Input
                        id="p-min"
                        type="number"
                        min="0"
                        step="0.001"
                        value={data.stock_minimo}
                        onChange={(e) => setData('stock_minimo', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="p-desc"
                    label="Descripción"
                    error={errors.descripcion}
                    className="sm:col-span-2"
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
                        >
                            <Select
                                value={data.stock_inicial_sede_id}
                                onValueChange={(value) => setData('stock_inicial_sede_id', value)}
                            >
                                <SelectTrigger id="p-stock-sede">
                                    <SelectValue />
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
                        <FormField
                            id="p-stock-qty"
                            label="Cantidad inicial"
                            error={errors.stock_inicial_cantidad}
                        >
                            <Input
                                id="p-stock-qty"
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={data.stock_inicial_cantidad}
                                onChange={(e) => setData('stock_inicial_cantidad', e.target.value)}
                            />
                        </FormField>
                    </>
                )}
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
