import { router, useForm } from '@inertiajs/react';
import { Loader2, Trash2 } from 'lucide-react';
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
import egresos from '@/routes/caja/sesiones/egresos';
import {
    CAJA_EGRESO_MOTIVOS,
    type CajaEgresoMotivo,
    type CajaSesion,
} from '../types';

type FormData = {
    monto: string;
    motivo: CajaEgresoMotivo;
    descripcion: string;
};

const money = (value: string | number | null | undefined): string => {
    const n = Number(value ?? 0);

    return n.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
};

export function SesionEgresoModal({
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
            monto: '',
            motivo: 'insumos',
            descripcion: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        reset();
        setData({ monto: '', motivo: 'insumos', descripcion: '' });
    }, [open, clearErrors, reset, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!sesion) {
            return;
        }

        post(egresos.store(sesion.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setData({ monto: '', motivo: 'insumos', descripcion: '' });
            },
        });
    };

    const lista = sesion?.egresos ?? [];

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Egresos de caja"
            description={
                sesion
                    ? `Salidas de efectivo de ${sesion.sede_nombre ?? 'este turno'}. Total: ${money(sesion.egresos_total)}`
                    : undefined
            }
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !sesion}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Registrar egreso
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Nuevo egreso" columns={2}>
                <FormField id="egreso-monto" label="Monto" required error={errors.monto}>
                    <Input
                        id="egreso-monto"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={data.monto}
                        onChange={(e) => setData('monto', e.target.value)}
                        autoFocus
                    />
                </FormField>

                <FormField id="egreso-motivo" label="Motivo" required error={errors.motivo}>
                    <Select
                        value={data.motivo}
                        onValueChange={(value) => setData('motivo', value as CajaEgresoMotivo)}
                    >
                        <SelectTrigger id="egreso-motivo" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CAJA_EGRESO_MOTIVOS.map((motivo) => (
                                <SelectItem key={motivo.value} value={motivo.value}>
                                    {motivo.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField
                    id="egreso-descripcion"
                    label="Descripción"
                    error={errors.descripcion}
                    className="sm:col-span-2"
                >
                    <Input
                        id="egreso-descripcion"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        maxLength={255}
                    />
                </FormField>
            </FormSection>

            <FormSection index={1} title="Registrados en este turno" columns={1}>
                {lista.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Aún no hay egresos en esta sesión.
                    </p>
                ) : (
                    <ul className="divide-y rounded-md border">
                        {lista.map((egreso) => (
                            <li
                                key={egreso.id}
                                className="flex items-start justify-between gap-3 px-3 py-2.5"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {egreso.motivo_label}
                                        <span className="ml-2 tabular-nums text-muted-foreground">
                                            {money(egreso.monto)}
                                        </span>
                                    </p>
                                    {egreso.descripcion ? (
                                        <p className="truncate text-xs text-muted-foreground">
                                            {egreso.descripcion}
                                        </p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                        {egreso.created_at
                                            ? new Date(egreso.created_at).toLocaleString('es-PE')
                                            : '—'}
                                        {egreso.creado_por?.name
                                            ? ` · ${egreso.creado_por.name}`
                                            : ''}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="cursor-pointer text-destructive"
                                    aria-label="Eliminar egreso"
                                    disabled={!sesion}
                                    onClick={() => {
                                        if (!sesion) {
                                            return;
                                        }

                                        router.delete(
                                            egresos.destroy({
                                                caja_sesion: sesion.id,
                                                egreso: egreso.id,
                                            }).url,
                                            { preserveScroll: true },
                                        );
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </FormSection>
        </FormModal>
    );
}
