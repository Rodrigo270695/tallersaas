import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, FileText, Printer, Receipt } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketPrintDialog } from '@/components/tickets/ticket-print-dialog';
import { normalizeTicketAncho } from '@/lib/ticket-ancho';
import { statusPillClass, ventaEstadoBadgeClass } from '@/lib/status-badge';
import { cn } from '@/lib/utils';
import ventas from '@/routes/caja/ventas';

type VentaLineaShow = {
    id: string;
    descripcion: string;
    cantidad: string;
    precio_unitario: string;
    subtotal: string;
};

type VentaPagoShow = {
    id: string;
    metodo: string;
    monto: string;
    monto_recibido: string | null;
    vuelto: string | null;
};

type VentaShowData = {
    id: string;
    numero: string;
    estado: string;
    moneda: string;
    subtotal: string;
    igv_monto: string;
    descuento_monto: string;
    total: string;
    metodo_pago: string | null;
    monto_recibido: string | null;
    vuelto: string | null;
    fecha_pago: string | null;
    created_at: string | null;
    notas: string | null;
    tipo_comprobante_sunat: number | null;
    fel_estado: string | null;
    cliente: string;
    cliente_doc: string | null;
    vehiculo: string | null;
    orden_trabajo: string | null;
    sede: string;
    cajero: string;
    igv_porcentaje: string;
    lineas: VentaLineaShow[];
    pagos: VentaPagoShow[];
    fel_document: { numero_completo: string | null } | null;
};

type ShowProps = {
    venta: VentaShowData;
    taller: { ticket_ancho_mm: string; emite_comprobantes_sunat: boolean };
    ticket: { puede_imprimir: boolean };
    ui: { auto_imprimir: boolean };
};

const METODO_LABEL: Record<string, string> = {
    efectivo: 'Efectivo',
    yape: 'Yape',
    plin: 'Plin',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    mixto: 'Mixto',
};

function formatMonto(amount: string | null, moneda: string): string {
    if (amount === null || amount === '') {
        return '—';
    }

    const n = Number(amount);

    if (Number.isNaN(n)) {
        return amount;
    }

    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: moneda === 'USD' ? 'USD' : 'PEN',
    }).format(n);
}

export default function Show({ venta, taller, ticket, ui }: ShowProps) {
    const [ticketModalOpen, setTicketModalOpen] = useState(false);
    const [ticketConAutoPrint, setTicketConAutoPrint] = useState(false);
    const autoImprimirProcesado = useRef(false);

    const fecha = venta.fecha_pago ?? venta.created_at;
    const ticketBaseUrl = ventas.ticket.url(venta.id);
    const configTicketAncho = normalizeTicketAncho(taller.ticket_ancho_mm);
    const esAnulada = venta.estado === 'anulado';
    const esTicketInterno =
        venta.tipo_comprobante_sunat === null || venta.tipo_comprobante_sunat === 0;
    const puedeVerTicket = ticket.puede_imprimir && !esAnulada && esTicketInterno;
    const metodoLabel = venta.metodo_pago
        ? (METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago)
        : '—';

    const documentoLabel = esTicketInterno
        ? 'Ticket interno'
        : venta.tipo_comprobante_sunat === 1
          ? 'Factura'
          : 'Boleta';

    useEffect(() => {
        if (!ui.auto_imprimir || autoImprimirProcesado.current || esAnulada) {
            return;
        }

        autoImprimirProcesado.current = true;

        if (esTicketInterno && puedeVerTicket) {
            setTicketConAutoPrint(true);
            setTicketModalOpen(true);
        }

        if (typeof window !== 'undefined' && window.location.search.includes('imprimir=')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('imprimir');
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        }
    }, [ui.auto_imprimir, esAnulada, esTicketInterno, puedeVerTicket]);

    const headerStats = useMemo(
        () => [
            { label: 'Cliente', value: venta.cliente, variant: 'default' as const },
            { label: 'Sede', value: venta.sede, variant: 'muted' as const },
            {
                label: 'Estado',
                value:
                    venta.estado === 'pagado'
                        ? 'Pagado'
                        : venta.estado === 'anulado'
                          ? 'Anulado'
                          : venta.estado,
                variant: 'primary' as const,
            },
        ],
        [venta.cliente, venta.sede, venta.estado],
    );

    return (
        <>
            <Head title={`Venta ${venta.numero}`} />

            <TicketPrintDialog
                open={ticketModalOpen}
                onOpenChange={setTicketModalOpen}
                ticketBaseUrl={ticketBaseUrl}
                configAncho={configTicketAncho}
                autoPrint={ticketConAutoPrint}
                onAutoPrintConsumed={() => setTicketConAutoPrint(false)}
            />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={venta.numero}
                    description="Detalle de productos vendidos, totales y datos del cobro."
                    stats={headerStats}
                    action={
                        <Button variant="outline" size="sm" asChild className="cursor-pointer gap-1.5">
                            <Link href={ventas.index.url()}>
                                <ArrowLeft className="size-4" aria-hidden />
                                Volver al listado
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-5 lg:grid-cols-[1fr_minmax(280px,340px)]">
                    <div className="flex min-w-0 flex-col gap-3">
                        {puedeVerTicket ? (
                            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-fit cursor-pointer gap-1.5 border-brand-300 font-medium text-brand-700 hover:bg-brand-50"
                                    onClick={() => setTicketModalOpen(true)}
                                >
                                    <Printer className="size-4 shrink-0" aria-hidden />
                                    Ver ticket
                                </Button>
                                <p className="text-xs leading-snug text-muted-foreground">
                                    Se abre aquí; elige 56, 58 u 80 mm en el cuadro y usa «Imprimir».
                                </p>
                            </div>
                        ) : null}

                        <Card className="border-border/60">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Receipt className="size-4 text-brand-600" aria-hidden />
                                    Productos vendidos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                                {venta.lineas.length === 0 ? (
                                    <p className="px-4 pb-4 text-sm text-muted-foreground">
                                        Sin líneas.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[520px] border-collapse text-sm">
                                            <thead className="bg-muted/40">
                                                <tr>
                                                    <th className="border-b border-border/60 px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                                                        Producto
                                                    </th>
                                                    <th className="w-24 border-b border-border/60 px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                                                        Cantidad
                                                    </th>
                                                    <th className="w-28 border-b border-border/60 px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                                                        P. unit.
                                                    </th>
                                                    <th className="w-28 border-b border-border/60 px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                                                        Subtotal línea
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {venta.lineas.map((ln) => (
                                                    <tr
                                                        key={ln.id}
                                                        className="border-b border-border/40 last:border-b-0"
                                                    >
                                                        <td className="px-4 py-3 align-middle font-medium">
                                                            {ln.descripcion}
                                                        </td>
                                                        <td className="px-4 py-3 text-right align-middle tabular-nums">
                                                            {Number(ln.cantidad).toLocaleString(
                                                                'es-PE',
                                                                { maximumFractionDigits: 3 },
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right align-middle tabular-nums text-muted-foreground">
                                                            {formatMonto(
                                                                ln.precio_unitario,
                                                                venta.moneda,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right align-middle font-medium tabular-nums">
                                                            {formatMonto(ln.subtotal, venta.moneda)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <p className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
                                    Precios y subtotales según la configuración de IGV al momento de
                                    la venta.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Card className="border-border/60">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Resumen del cobro</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <dl className="space-y-2">
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted-foreground">Fecha</dt>
                                        <dd className="text-right tabular-nums">
                                            {fecha
                                                ? new Intl.DateTimeFormat('es-PE', {
                                                      dateStyle: 'short',
                                                      timeStyle: 'short',
                                                  }).format(new Date(fecha))
                                                : '—'}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted-foreground">Cajero</dt>
                                        <dd className="text-right">{venta.cajero}</dd>
                                    </div>
                                    {venta.orden_trabajo ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">OT</dt>
                                            <dd className="text-right font-mono text-xs">
                                                {venta.orden_trabajo}
                                            </dd>
                                        </div>
                                    ) : null}
                                    {venta.vehiculo ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">Placa</dt>
                                            <dd className="text-right font-mono text-xs">
                                                {venta.vehiculo}
                                            </dd>
                                        </div>
                                    ) : null}
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted-foreground">Método de pago</dt>
                                        <dd className="text-right">{metodoLabel}</dd>
                                    </div>
                                </dl>

                                <div className="space-y-1.5 border-t border-border/60 pt-3">
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Subtotal (sin IGV)
                                        </span>
                                        <span className="tabular-nums">
                                            {formatMonto(venta.subtotal, venta.moneda)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            IGV ({venta.igv_porcentaje}%)
                                        </span>
                                        <span className="tabular-nums">
                                            {formatMonto(venta.igv_monto, venta.moneda)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3 text-base font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums text-brand-700">
                                            {formatMonto(venta.total, venta.moneda)}
                                        </span>
                                    </div>
                                    {venta.monto_recibido !== null ? (
                                        <div className="flex justify-between gap-3">
                                            <span className="text-muted-foreground">
                                                Monto recibido
                                            </span>
                                            <span className="tabular-nums">
                                                {formatMonto(venta.monto_recibido, venta.moneda)}
                                            </span>
                                        </div>
                                    ) : null}
                                    {venta.vuelto !== null ? (
                                        <div className="flex justify-between gap-3">
                                            <span className="text-muted-foreground">Vuelto</span>
                                            <span className="tabular-nums">
                                                {formatMonto(venta.vuelto, venta.moneda)}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="space-y-2 border-t border-border/60 pt-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                            <FileText className="size-3.5" aria-hidden />
                                            Documento de venta
                                        </span>
                                        <Badge variant="secondary" className="font-normal">
                                            {documentoLabel}
                                        </Badge>
                                    </div>
                                    <p className="text-xs leading-snug text-muted-foreground">
                                        {esTicketInterno
                                            ? 'Venta registrada solo con ticket de caja. No está vinculada a SUNAT.'
                                            : venta.fel_estado === 'emitido'
                                              ? `CPE emitido${venta.fel_document?.numero_completo ? `: ${venta.fel_document.numero_completo}` : '.'}`
                                              : 'Comprobante SUNAT pendiente o no emitido.'}
                                    </p>
                                    <span
                                        className={cn(
                                            statusPillClass,
                                            ventaEstadoBadgeClass[
                                                venta.estado as keyof typeof ventaEstadoBadgeClass
                                            ] ?? ventaEstadoBadgeClass.pendiente,
                                        )}
                                    >
                                        {venta.estado === 'pagado'
                                            ? 'Pagado'
                                            : venta.estado === 'anulado'
                                              ? 'Anulado'
                                              : venta.estado}
                                    </span>
                                </div>

                                {venta.notas ? (
                                    <div className="border-t border-border/60 pt-3">
                                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                                            Notas
                                        </p>
                                        <p className="text-sm whitespace-pre-wrap">{venta.notas}</p>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        { title: 'Caja' },
        { title: 'Ventas', href: '/caja/ventas' },
        { title: 'Detalle' },
    ],
};
