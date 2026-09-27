import { Link, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
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

type Linea = {
    servicio_id: string;
    descripcion: string;
    cantidad: string;
    precio_unitario: string;
};

const METODOS = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'yape', label: 'Yape' },
    { value: 'plin', label: 'Plin' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'transferencia', label: 'Transferencia' },
];

const money = (value: number): string =>
    value.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export function LavadoCobroModal({
    open,
    onOpenChange,
    lavadoId,
    lineas,
    total,
    sesionAbierta,
    felReady,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lavadoId: string;
    lineas: Linea[];
    total: number;
    sesionAbierta: boolean;
    felReady: boolean;
}) {
    const form = useForm({
        lineas: [] as { concepto: string; cantidad: string; precio_unitario: string; servicio_id: string | null; producto_id: null }[],
        pagos: [{ metodo: 'efectivo', monto: '', monto_recibido: '' }],
        notas: '',
        tipo_comprobante_sunat: '0',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            lineas: lineas.map((linea) => ({
                concepto: linea.descripcion,
                cantidad: linea.cantidad,
                precio_unitario: linea.precio_unitario,
                servicio_id: linea.servicio_id || null,
                producto_id: null,
            })),
            pagos: [
                {
                    metodo: 'efectivo',
                    monto: total.toFixed(2),
                    monto_recibido: total.toFixed(2),
                },
            ],
            notas: '',
            tipo_comprobante_sunat: '0',
        });
        // form identity changes every render; only reset when the modal opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, lavadoId]);

    const submit = () => {
        form.transform((data) => ({
            ...data,
            tipo_comprobante_sunat: Number(data.tipo_comprobante_sunat),
            pagos: data.pagos.map((pago) => ({
                metodo: pago.metodo,
                monto: total.toFixed(2),
                monto_recibido:
                    pago.metodo === 'efectivo' && pago.monto_recibido !== ''
                        ? pago.monto_recibido
                        : null,
            })),
        }));
        form.post(`/taller/lavados/${lavadoId}/cobrar`, { preserveScroll: true });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Cobrar car wash"
            description="Confirma la precuenta y registra el pago. El ticket sale en la venta."
            onSubmit={(event) => {
                event.preventDefault();
                if (sesionAbierta) {
                    submit();
                }
            }}
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    {sesionAbierta ? (
                        <Button type="submit" disabled={form.processing || total <= 0}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : 'Cobrar'}
                        </Button>
                    ) : (
                        <Button type="button" asChild>
                            <Link href="/caja/sesiones">Abrir caja</Link>
                        </Button>
                    )}
                </>
            }
        >
            {!sesionAbierta ? (
                <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    Abre una caja de esta sede antes de cobrar.
                </p>
            ) : null}

            <FormSection title="Pago" columns={2}>
                <FormField id="cw-metodo" label="Método" error={form.errors['pagos.0.metodo']}>
                    <Select
                        value={form.data.pagos[0]?.metodo}
                        onValueChange={(value) =>
                            form.setData('pagos', [{ ...form.data.pagos[0], metodo: value }])
                        }
                    >
                        <SelectTrigger id="cw-metodo" className="h-9 w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {METODOS.map((metodo) => (
                                <SelectItem key={metodo.value} value={metodo.value}>
                                    {metodo.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="cw-monto" label="Monto" error={form.errors['pagos.0.monto']}>
                    <Input id="cw-monto" value={money(total)} readOnly />
                </FormField>
                {form.data.pagos[0]?.metodo === 'efectivo' ? (
                    <FormField
                        id="cw-recibido"
                        label="Recibido"
                        error={form.errors['pagos.0.monto_recibido']}
                    >
                        <Input
                            id="cw-recibido"
                            inputMode="decimal"
                            value={form.data.pagos[0].monto_recibido}
                            onChange={(event) =>
                                form.setData('pagos', [
                                    { ...form.data.pagos[0], monto_recibido: event.target.value },
                                ])
                            }
                        />
                    </FormField>
                ) : null}
                {felReady ? (
                    <FormField id="cw-comp" label="Comprobante" className="sm:col-span-2">
                        <Select
                            value={form.data.tipo_comprobante_sunat}
                            onValueChange={(value) => form.setData('tipo_comprobante_sunat', value)}
                        >
                            <SelectTrigger id="cw-comp" className="h-9 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">Ticket interno</SelectItem>
                                <SelectItem value="2">Boleta</SelectItem>
                                <SelectItem value="1">Factura</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                ) : null}
            </FormSection>

            {form.processing ? <Loader2 className="size-4 animate-spin" /> : null}
            {form.errors.lineas ? <p className="text-sm text-destructive">{form.errors.lineas}</p> : null}
            {form.errors.caja_sesion_id ? (
                <p className="text-sm text-destructive">{form.errors.caja_sesion_id}</p>
            ) : null}
        </FormModal>
    );
}
