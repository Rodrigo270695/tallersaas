import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import stock from '@/routes/inventario/stock';
import type { StockProducto } from '../types';

type FormData = {
    producto_id: string;
    sede_id: string;
    cantidad: string;
};

/** Evita "5.000" en el input: deja "5" o "1.25" si hay decimales. */
const formatCantidadInput = (value: string | number | null | undefined): string => {
    const n = Number(value ?? 0);

    if (!Number.isFinite(n)) {
        return '0';
    }

    return String(parseFloat(n.toFixed(3)));
};

export function StockAdjustDialog({
    open,
    onOpenChange,
    producto,
    sedeId,
    sedeNombre,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    producto: StockProducto | null;
    sedeId: string;
    sedeNombre: string;
}) {
    const { data, setData, patch, processing, errors, clearErrors } = useForm<FormData>({
        producto_id: '',
        sede_id: '',
        cantidad: '',
    });

    useEffect(() => {
        if (!open || !producto) {
            return;
        }

        clearErrors();
        setData({
            producto_id: producto.id,
            sede_id: sedeId,
            cantidad: formatCantidadInput(producto.cantidad_stock),
        });
    }, [open, producto, sedeId, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        patch(stock.adjust().url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Ajustar stock"
            description={
                producto
                    ? `Define la cantidad real de ${producto.nombre} en ${sedeNombre || 'esta sede'}.`
                    : undefined
            }
            size="sm"
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
                    <Button type="submit" disabled={processing || !producto} className="cursor-pointer gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Guardar
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Cantidad" columns={1}>
                <FormField id="stock-qty" label="Cantidad en sede" required error={errors.cantidad}>
                    <Input
                        id="stock-qty"
                        type="number"
                        min="0"
                        step="0.001"
                        value={data.cantidad}
                        onChange={(e) => setData('cantidad', e.target.value)}
                        autoFocus
                    />
                </FormField>
                {errors.producto_id && <p className="text-sm text-destructive">{errors.producto_id}</p>}
                {errors.sede_id && <p className="text-sm text-destructive">{errors.sede_id}</p>}
            </FormSection>
        </FormModal>
    );
}
