import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect  } from 'react';
import type {FormEvent} from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import type { OrdenTrabajo } from '../types';

type FormData = {
    telefono: string;
    mensaje: string;
    guardar_en_cliente: boolean;
};

function money(amount: number): string {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function buildOrdenListaMensaje(orden: OrdenTrabajo, tallerNombre: string): string {
    const cliente = (orden.cliente?.nombres ?? 'hola').trim() || 'hola';
    const placa = (orden.vehiculo?.placa ?? '').trim();
    const vehiculo =
        [orden.vehiculo?.marca?.nombre, orden.vehiculo?.modelo?.nombre, placa !== '' ? `placa ${placa}` : null]
            .filter(Boolean)
            .join(' ')
            .trim() || 'tu vehículo';
    const saldo = Number(orden.saldo ?? 0);
    const lineas = [
        `Hola ${cliente} 👋`,
        `Tu ${vehiculo} ya está listo para recoger en ${tallerNombre}.`,
        `Orden ${orden.numero}.`,
    ];

    if (saldo > 0) {
        lineas.push(`Saldo pendiente: S/ ${money(saldo)}.`);
    }

    lineas.push('Te esperamos.');

    return lineas.join('\n');
}

export function OrdenAvisarListaModal({
    open,
    onOpenChange,
    orden,
    tallerNombre,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orden: OrdenTrabajo | null;
    tallerNombre: string;
}) {
    const { data, setData, post, processing, errors, clearErrors } = useForm<FormData>({
        telefono: '',
        mensaje: '',
        guardar_en_cliente: false,
    });

    useEffect(() => {
        if (!open || !orden) {
            return;
        }

        clearErrors();
        const telefono = (orden.cliente?.telefono ?? '').trim();
        setData({
            telefono,
            mensaje: buildOrdenListaMensaje(orden, tallerNombre),
            guardar_en_cliente: telefono === '',
        });
    }, [open, orden, tallerNombre, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!orden) {
            return;
        }

        post(ordenesTrabajo.avisarLista(orden.id).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const yaAvisada = Boolean(orden?.lista_notificada_at);

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={yaAvisada ? 'Reenviar aviso por WhatsApp' : 'Avisar por WhatsApp'}
            description={
                orden
                    ? `Se enviará por OpenWA si está conectado; si no, se abre WhatsApp con el mensaje de la orden ${orden.numero}.`
                    : undefined
            }
            size="md"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Enviar aviso
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Mensaje al cliente" columns={1}>
                <FormField id="wa-telefono" label="WhatsApp" required error={errors.telefono}>
                    <Input
                        id="wa-telefono"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                        placeholder="987654321"
                        autoComplete="tel"
                        autoFocus
                    />
                </FormField>
                <FormField id="wa-mensaje" label="Mensaje" error={errors.mensaje}>
                    <Textarea
                        id="wa-mensaje"
                        value={data.mensaje}
                        onChange={(e) => setData('mensaje', e.target.value)}
                        rows={7}
                    />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                        checked={data.guardar_en_cliente}
                        onCheckedChange={(checked) =>
                            setData('guardar_en_cliente', checked === true)
                        }
                    />
                    <span className="text-sm">Guardar este número en la ficha del cliente</span>
                </label>
            </FormSection>
        </FormModal>
    );
}
