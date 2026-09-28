import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { postIa } from '@/lib/taller-ia';
import { toastManager } from '@/lib/toast';

type Pendiente = {
    vehiculo_id: string;
    tipo: string;
    etiqueta: string;
    placa: string;
    auto: string;
    cliente_id: string | null;
    cliente: string;
    puede_avisar: boolean;
    detalle: string;
    atrasado: boolean;
    dias_restantes: number;
};

type Callado = {
    id: string;
    numero: string;
    cliente_id: string | null;
    cliente: string;
    auto: string;
    enviado_hace: string;
    items: string[];
    puede_avisar: boolean;
};

type Compra = {
    nombre: string;
    demanda: string;
    stock: string;
    falta: string;
};

type CampanaPersona = {
    cliente_id: string;
    cliente: string;
    auto: string;
};

type Props = {
    pendientes: Pendiente[];
    callados: Callado[];
    compras: Compra[];
    campana: { total: number; muestra: CampanaPersona[] };
};

export default function Index({ pendientes, callados, compras, campana }: Props) {
    const [seguimientos, setSeguimientos] = useState<Record<string, string>>({});
    const [resumen, setResumen] = useState('');
    const [campanaTexto, setCampanaTexto] = useState('');
    const [busy, setBusy] = useState<string | null>(null);

    const avisar = (row: Pendiente) => {
        router.post(
            '/taller/ia/mantenimiento',
            { vehiculo_id: row.vehiculo_id, tipo: row.tipo },
            { preserveScroll: true },
        );
    };

    const redactarSeguimiento = async (row: Callado) => {
        setBusy(row.id);

        try {
            const body = new FormData();
            body.set('presupuesto_id', row.id);
            const result = await postIa<{ mensaje: string }>('/taller/ia/seguimiento', body);
            setSeguimientos((prev) => ({ ...prev, [row.id]: result.mensaje }));
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo redactar.' });
        } finally {
            setBusy(null);
        }
    };

    const enviarSeguimiento = (row: Callado) => {
        if (row.cliente_id === null) {
            return;
        }

        router.post(
            '/taller/ia/enviar',
            {
                cliente_id: row.cliente_id,
                cuerpo: seguimientos[row.id] ?? '',
                tipo: 'presupuesto_seguimiento',
                referencia_id: row.id,
                dedupe_key: `presupuesto:${row.id}:${new Date().toISOString().slice(0, 10)}`,
            },
            { preserveScroll: true },
        );
    };

    const redactarCompras = async () => {
        setBusy('compras');

        try {
            const result = await postIa<{ mensaje: string }>('/taller/ia/compras-resumen', new FormData());
            setResumen(result.mensaje);
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo resumir.' });
        } finally {
            setBusy(null);
        }
    };

    const redactarCampana = async () => {
        setBusy('campana');

        try {
            const result = await postIa<{ mensaje: string }>('/taller/ia/campana', new FormData());
            setCampanaTexto(result.mensaje);
        } catch (error) {
            toastManager.error({ title: error instanceof Error ? error.message : 'No se pudo redactar la campaña.' });
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <Head title="Asistente" />
            <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                <PageHeader
                    title="Asistente"
                    description="Recordatorios según el historial de cada auto, seguimiento de presupuestos, compras de la semana y una campaña."
                />

                <section className="grid gap-3 rounded-xl border p-4">
                    <h2 className="text-sm font-semibold">Próximo aceite, revisión o plumillas</h2>
                    {pendientes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Ningún auto está cerca de su próximo servicio.</p>
                    ) : (
                        pendientes.map((row) => (
                            <div key={`${row.vehiculo_id}-${row.tipo}`} className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-medium">
                                        {row.auto} · {row.etiqueta}
                                        {row.atrasado ? ' · atrasado' : ''}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{row.cliente}. {row.detalle}</p>
                                </div>
                                <Button type="button" size="sm" variant="outline" disabled={!row.puede_avisar} onClick={() => avisar(row)}>
                                    Avisar por WhatsApp
                                </Button>
                            </div>
                        ))
                    )}
                </section>

                <section className="grid gap-3 rounded-xl border p-4">
                    <h2 className="text-sm font-semibold">Presupuestos sin respuesta</h2>
                    {callados.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay presupuestos enviados hace más de dos días.</p>
                    ) : (
                        callados.map((row) => (
                            <div key={row.id} className="grid gap-2 border-t pt-3">
                                <p className="text-sm font-medium">
                                    {row.numero} · {row.cliente} · {row.auto}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Enviado {row.enviado_hace}. {row.items.join(', ')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" size="sm" variant="outline" disabled={busy === row.id} onClick={() => void redactarSeguimiento(row)}>
                                        Redactar seguimiento
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={!row.puede_avisar || (seguimientos[row.id] ?? '').trim() === ''}
                                        onClick={() => enviarSeguimiento(row)}
                                    >
                                        Encolar WhatsApp
                                    </Button>
                                </div>
                                {seguimientos[row.id] !== undefined ? (
                                    <Textarea
                                        rows={3}
                                        value={seguimientos[row.id]}
                                        onChange={(event) =>
                                            setSeguimientos((prev) => ({ ...prev, [row.id]: event.target.value }))
                                        }
                                    />
                                ) : null}
                            </div>
                        ))
                    )}
                </section>

                <section className="grid gap-3 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold">Qué comprar para las citas de la semana</h2>
                        <Button type="button" size="sm" variant="outline" disabled={busy === 'compras' || compras.length === 0} onClick={() => void redactarCompras()}>
                            Redactar resumen
                        </Button>
                    </div>
                    {compras.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No falta stock para lo que suelen pedir los autos con cita.</p>
                    ) : (
                        compras.map((row) => (
                            <p key={row.nombre} className="text-sm">
                                {row.nombre}: piden {row.demanda}, hay {row.stock}, faltan {row.falta}
                            </p>
                        ))
                    )}
                    {resumen !== '' ? <p className="text-sm">{resumen}</p> : null}
                </section>

                <section className="grid gap-3 rounded-xl border p-4">
                    <h2 className="text-sm font-semibold">Campaña de plumillas</h2>
                    <p className="text-sm text-muted-foreground">
                        {campana.total === 0
                            ? 'Todos los autos con historial cambiaron plumillas en los últimos dos años.'
                            : `${campana.total} clientes sin cambio de plumillas en dos años.`}
                    </p>
                    {campana.muestra.map((persona) => (
                        <p key={persona.cliente_id} className="text-sm">
                            {persona.cliente} · {persona.auto}
                        </p>
                    ))}
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={busy === 'campana' || campana.total === 0} onClick={() => void redactarCampana()}>
                            Redactar mensaje
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={campanaTexto.trim() === ''}
                            onClick={() =>
                                router.post('/taller/ia/campana-enviar', { mensaje: campanaTexto }, { preserveScroll: true })
                            }
                        >
                            Encolar a todos
                        </Button>
                    </div>
                    {campanaTexto !== '' ? (
                        <Textarea rows={3} value={campanaTexto} onChange={(event) => setCampanaTexto(event.target.value)} />
                    ) : null}
                </section>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Asistente', href: '/taller/ia' }],
};
