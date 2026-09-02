import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
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
import movimientos from '@/routes/inventario/movimientos';
import type { ProductoMovimientoOption, SedeOption } from '../types';

type FormData = {
    producto_id: string;
    sede_id: string;
    tipo: 'entrada' | 'salida' | 'merma';
    cantidad: string;
    notas: string;
};

const TIPOS: { value: FormData['tipo']; label: string }[] = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' },
    { value: 'merma', label: 'Merma' },
];

export function MovimientoFormModal({
    open,
    onOpenChange,
    productos,
    sedes,
    defaultSedeId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productos: readonly ProductoMovimientoOption[];
    sedes: readonly SedeOption[];
    defaultSedeId: string;
}) {
    const { data, setData, post, processing, errors, clearErrors } = useForm<FormData>({
        producto_id: '',
        sede_id: '',
        tipo: 'entrada',
        cantidad: '',
        notas: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            producto_id: productos[0]?.id ?? '',
            sede_id: defaultSedeId || sedes[0]?.id || '',
            tipo: 'entrada',
            cantidad: '',
            notas: '',
        });
    }, [open, productos, sedes, defaultSedeId, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        post(movimientos.store().url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Registrar movimiento"
            description="Entrada aumenta stock. Salida y merma lo descuentan."
            size="md"
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
                    <Button
                        type="submit"
                        disabled={processing || productos.length === 0 || sedes.length === 0}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Registrar
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Kardex" columns={2}>
                <FormField
                    id="mov-producto"
                    label="Repuesto"
                    required
                    error={errors.producto_id}
                    className="sm:col-span-2"
                >
                    <Select
                        value={data.producto_id}
                        onValueChange={(value) => setData('producto_id', value)}
                    >
                        <SelectTrigger id="mov-producto">
                            <SelectValue placeholder="Elegir repuesto" />
                        </SelectTrigger>
                        <SelectContent>
                            {productos.map((producto) => (
                                <SelectItem key={producto.id} value={producto.id}>
                                    {producto.nombre}
                                    {producto.sku ? ` (${producto.sku})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="mov-sede" label="Sede" required error={errors.sede_id}>
                    <Select value={data.sede_id} onValueChange={(value) => setData('sede_id', value)}>
                        <SelectTrigger id="mov-sede">
                            <SelectValue placeholder="Sede" />
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
                <FormField id="mov-tipo" label="Tipo" required error={errors.tipo}>
                    <Select
                        value={data.tipo}
                        onValueChange={(value) => setData('tipo', value as FormData['tipo'])}
                    >
                        <SelectTrigger id="mov-tipo">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIPOS.map((tipo) => (
                                <SelectItem key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="mov-qty" label="Cantidad" required error={errors.cantidad}>
                    <Input
                        id="mov-qty"
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={data.cantidad}
                        onChange={(e) => setData('cantidad', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="mov-notas"
                    label="Notas"
                    error={errors.notas}
                    className="sm:col-span-2"
                >
                    <Textarea
                        id="mov-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={2}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}
