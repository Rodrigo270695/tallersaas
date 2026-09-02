import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect  } from 'react';
import type {FormEvent} from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import presupuestos from '@/routes/taller/presupuestos';
import type { Presupuesto } from '../types';

type FormData = {
    telefono: string;
    mensaje: string;
    guardar_en_cliente: boolean;
};

function money(amount: number): string {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildPresupuestoMensaje(presupuesto: Presupuesto, tallerNombre: string): string {
    const cliente = (presupuesto.cliente?.nombres ?? 'hola').trim() || 'hola';
    const placa = (presupuesto.vehiculo?.placa ?? '').trim();
    const vehiculo =
        [presupuesto.vehiculo?.marca?.nombre, presupuesto.vehiculo?.modelo?.nombre, placa !== '' ? `placa ${placa}` : null]
            .filter(Boolean)
            .join(' ')
            .trim() || 'tu vehículo';
    const link = `${window.location.origin}/p/${presupuesto.public_token}`;
    const validez =
        presupuesto.valido_hasta !== null && presupuesto.valido_hasta !== ''
            ? `⏳ Válido hasta: ${new Date(presupuesto.valido_hasta).toLocaleDateString('es-PE')}\n`
            : '';

    return [
        `Hola ${cliente} 👋`,
        '',
        `📋 *${tallerNombre}* te envía el presupuesto para *${vehiculo}*`,
        `Referencia: *${presupuesto.numero}*`,
        `Total estimado: *S/ ${money(Number(presupuesto.total ?? 0))}*`,
        validez.trim(),
        'Revisa el detalle y confirma aquí:',
        link,
        '',
        `— ${tallerNombre}`,
    ]
        .filter((line, index, arr) => line !== '' || arr[index + 1] !== '')
        .join('\n');
}

export function PresupuestoEnviarModal({
    open,
    onOpenChange,
    presupuesto,
    tallerNombre,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    presupuesto: Presupuesto | null;
    tallerNombre: string;
}) {
    const { data, setData, post, processing, errors, clearErrors } = useForm<FormData>({
        telefono: '',
        mensaje: '',
        guardar_en_cliente: false,
    });

    useEffect(() => {
        if (!open || !presupuesto) {
            return;
        }

        clearErrors();
        const telefono = (presupuesto.cliente?.telefono ?? '').trim();
        setData({
            telefono,
            mensaje: buildPresupuestoMensaje(presupuesto, tallerNombre),
            guardar_en_cliente: telefono === '',
        });
    }, [open, presupuesto, tallerNombre, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!presupuesto) {
            return;
        }

        post(presupuestos.enviar(presupuesto.id).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Enviar presupuesto"
            description={
                presupuesto
                    ? `WhatsApp con enlace de aprobación para ${presupuesto.numero}.`
                    : undefined
            }
            size="md"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing} className="gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Enviar
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Mensaje al cliente" columns={1}>
                <FormField id="pre-telefono" label="WhatsApp" required error={errors.telefono}>
                    <Input
                        id="pre-telefono"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                        placeholder="987654321"
                        autoFocus
                    />
                </FormField>
                <FormField id="pre-mensaje" label="Mensaje" error={errors.mensaje}>
                    <Textarea
                        id="pre-mensaje"
                        value={data.mensaje}
                        onChange={(e) => setData('mensaje', e.target.value)}
                        rows={8}
                    />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                        checked={data.guardar_en_cliente}
                        onCheckedChange={(checked) => setData('guardar_en_cliente', checked === true)}
                    />
                    <span className="text-sm">Guardar este número en la ficha del cliente</span>
                </label>
            </FormSection>
        </FormModal>
    );
}
