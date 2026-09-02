import { Head, useForm } from '@inertiajs/react';
import { Check, Loader2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type Item = {
    descripcion: string;
    cantidad: string | number;
    precio_unitario: string | number;
    subtotal: string | number;
};

type Props = {
    presupuesto: {
        numero: string;
        estado: string;
        diagnostico: string | null;
        subtotal: string | number;
        igv_total: string | number;
        total: string | number;
        valido_hasta: string | null;
        cliente_nombre: string | null;
        vehiculo_label: string;
        items: Item[];
        puede_responder: boolean;
    };
    taller: {
        nombre: string;
        telefono: string | null;
        moneda: string;
        precio_incluye_igv: boolean;
    };
    token: string;
};

const money = (value: string | number, moneda: string): string =>
    Number(value ?? 0).toLocaleString('es-PE', { style: 'currency', currency: moneda });

const estadoLabel: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Pendiente de tu respuesta',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    vencido: 'Vencido',
    convertido: 'Aplicado en taller',
};

export default function PresupuestoPublico({ presupuesto, taller, token }: Props) {
    const [showReject, setShowReject] = useState(false);
    const aprobarForm = useForm({});
    const rechazarForm = useForm({ motivo: '' });

    const onAprobar = (event: FormEvent) => {
        event.preventDefault();
        aprobarForm.post(`/p/${token}/aprobar`, { preserveScroll: true });
    };

    const onRechazar = (event: FormEvent) => {
        event.preventDefault();
        rechazarForm.post(`/p/${token}/rechazar`, {
            preserveScroll: true,
            onSuccess: () => setShowReject(false),
        });
    };

    return (
        <>
            <Head title={`Presupuesto ${presupuesto.numero}`} />

            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4">
                <div className="space-y-2 text-center">
                    <p className="text-sm font-medium text-brand-700">{taller.nombre}</p>
                    <h1 className="text-2xl font-semibold tracking-tight">Presupuesto {presupuesto.numero}</h1>
                    <p className="text-sm text-muted-foreground">
                        {presupuesto.cliente_nombre ?? 'Cliente'} · {presupuesto.vehiculo_label}
                    </p>
                    <p className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium">
                        {estadoLabel[presupuesto.estado] ?? presupuesto.estado}
                    </p>
                </div>

                {presupuesto.diagnostico && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Alcance del trabajo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                {presupuesto.diagnostico}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Detalle</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {presupuesto.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin líneas detalladas.</p>
                        ) : (
                            presupuesto.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{item.descripcion}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {Number(item.cantidad)} ×{' '}
                                            {money(item.precio_unitario, taller.moneda)}
                                        </p>
                                    </div>
                                    <span className="text-sm font-medium tabular-nums">
                                        {money(item.subtotal, taller.moneda)}
                                    </span>
                                </div>
                            ))
                        )}

                        <div className="space-y-1 border-t pt-3 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{money(presupuesto.subtotal, taller.moneda)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>IGV{taller.precio_incluye_igv ? ' (incluido)' : ''}</span>
                                <span>{money(presupuesto.igv_total, taller.moneda)}</span>
                            </div>
                            <div className="flex justify-between text-base font-semibold">
                                <span>Total estimado</span>
                                <span>{money(presupuesto.total, taller.moneda)}</span>
                            </div>
                        </div>

                        {presupuesto.valido_hasta && (
                            <p className="text-xs text-muted-foreground">
                                Válido hasta{' '}
                                {new Date(presupuesto.valido_hasta).toLocaleDateString('es-PE')}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {presupuesto.puede_responder && (
                    <Card className="border-brand-200/70">
                        <CardContent className="flex flex-col gap-3 pt-6">
                            {!showReject ? (
                                <>
                                    <form onSubmit={onAprobar}>
                                        <Button
                                            type="submit"
                                            className="w-full cursor-pointer gap-2"
                                            disabled={aprobarForm.processing}
                                        >
                                            {aprobarForm.processing ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <Check className="size-4" />
                                            )}
                                            Aprobar presupuesto
                                        </Button>
                                    </form>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full cursor-pointer gap-2"
                                        onClick={() => setShowReject(true)}
                                    >
                                        <X className="size-4" />
                                        Rechazar
                                    </Button>
                                </>
                            ) : (
                                <form onSubmit={onRechazar} className="space-y-3">
                                    <Textarea
                                        value={rechazarForm.data.motivo}
                                        onChange={(e) => rechazarForm.setData('motivo', e.target.value)}
                                        placeholder="Motivo opcional"
                                        rows={3}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 cursor-pointer"
                                            onClick={() => setShowReject(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            className="flex-1 cursor-pointer gap-2"
                                            disabled={rechazarForm.processing}
                                        >
                                            {rechazarForm.processing && (
                                                <Loader2 className="size-4 animate-spin" />
                                            )}
                                            Confirmar rechazo
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}

                {taller.telefono && (
                    <p className="text-center text-xs text-muted-foreground">
                        Dudas: {taller.telefono}
                    </p>
                )}
            </div>
        </>
    );
}
