import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';
import sesiones from '@/routes/caja/sesiones';
import type { CajaSesion } from '../types';

type FormData = {
    saldo_cierre_efectivo: string;
    notas: string;
};

export function CerrarCajaModal({
    open,
    onOpenChange,
    sesion,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sesion: CajaSesion | null;
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            saldo_cierre_efectivo: '',
            notas: '',
        });
    const { remember, requestClose } = useUnsavedFormGuard(data, onOpenChange);

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        reset();
        const initial = { saldo_cierre_efectivo: '', notas: '' };
        remember(initial);
        setData(initial);
    }, [open, clearErrors, reset, setData, remember]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!sesion) {
            return;
        }

        post(sesiones.cerrar(sesion.id).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={requestClose}
            title="Cerrar caja"
            description={
                sesion
                    ? `Arqueo de ${sesion.sede_nombre ?? 'la sede'} · apertura S/ ${sesion.saldo_apertura}${
                          Number(sesion.egresos_total ?? 0) > 0
                              ? ` · egresos S/ ${sesion.egresos_total}`
                              : ''
                      }`
                    : undefined
            }
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => requestClose(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !sesion}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Cerrar caja
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Arqueo" columns={1}>
                <FormField
                    id="caja-cierre"
                    label="Efectivo contado"
                    required
                    error={errors.saldo_cierre_efectivo}
                >
                    <Input
                        id="caja-cierre"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.saldo_cierre_efectivo}
                        onChange={(e) =>
                            setData('saldo_cierre_efectivo', e.target.value)
                        }
                        autoFocus
                    />
                </FormField>
                <FormField id="caja-cierre-notas" label="Notas de cierre" error={errors.notas}>
                    <Textarea
                        id="caja-cierre-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={2}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}
