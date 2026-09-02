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
import sesiones from '@/routes/caja/sesiones';
import type { SedeOpcion } from '../types';

type FormData = {
    sede_id: string;
    moneda: string;
    saldo_apertura: string;
    notas: string;
};

export function AbrirCajaModal({
    open,
    onOpenChange,
    sedes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sedes: readonly SedeOpcion[];
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            sede_id: sedes[0]?.id ?? '',
            moneda: 'PEN',
            saldo_apertura: '0',
            notas: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        reset();
        setData({
            sede_id: sedes[0]?.id ?? '',
            moneda: 'PEN',
            saldo_apertura: '0',
            notas: '',
        });
    }, [open, sedes, clearErrors, reset, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        post(sesiones.store().url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Abrir caja"
            description="Solo puede haber una caja abierta por sede y por usuario."
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !data.sede_id}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Abrir caja
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Apertura" columns={2}>
                <FormField
                    id="caja-sede"
                    label="Sede"
                    required
                    error={errors.sede_id}
                    className="sm:col-span-2"
                >
                    <Select
                        value={data.sede_id}
                        onValueChange={(value) => setData('sede_id', value)}
                    >
                        <SelectTrigger id="caja-sede" className="w-full">
                            <SelectValue placeholder="Selecciona una sede" />
                        </SelectTrigger>
                        <SelectContent>
                            {sedes.map((sede) => (
                                <SelectItem key={sede.id} value={sede.id}>
                                    {sede.nombre} ({sede.codigo})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField
                    id="caja-saldo"
                    label="Saldo de apertura"
                    required
                    error={errors.saldo_apertura}
                >
                    <Input
                        id="caja-saldo"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.saldo_apertura}
                        onChange={(e) => setData('saldo_apertura', e.target.value)}
                    />
                </FormField>

                <FormField id="caja-moneda" label="Moneda" error={errors.moneda}>
                    <Select
                        value={data.moneda}
                        onValueChange={(value) => setData('moneda', value)}
                    >
                        <SelectTrigger id="caja-moneda" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PEN">PEN</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField
                    id="caja-notas"
                    label="Notas"
                    error={errors.notas}
                    className="sm:col-span-2"
                >
                    <Textarea
                        id="caja-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={2}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}
