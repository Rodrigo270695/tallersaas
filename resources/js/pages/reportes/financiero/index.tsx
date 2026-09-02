import { Head } from '@inertiajs/react';
import { Receipt, Ticket, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import {
    DashboardKpiGrid,
    type DashboardKpiItem,
} from '@/pages/dashboard/components/dashboard-kpi-grid';
import { PageHeader } from '@/components/data-page';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import financiero from '@/routes/reportes/financiero';
import { ReporteFilters, type ReportePeriodo, type SedeOption } from '../components/reporte-filters';

type MetodoRow = {
    metodo: string;
    label: string;
    ventas: number;
    total: string;
};

type SedeRow = {
    sede_id: string;
    sede_nombre: string;
    ventas: number;
    total: string;
};

type Props = {
    moneda: string;
    periodo: ReportePeriodo;
    periodo_label: string;
    sede_id: string | null;
    kpis: {
        ventas_count: number;
        ventas_total: string;
        ticket_promedio: string;
        igv_total: string;
    };
    por_metodo: MetodoRow[];
    por_sede: SedeRow[];
    fel: {
        emitidos: number;
        pendientes: number;
        rechazados: number;
        sin_cpe: number;
    };
    sedes: readonly SedeOption[];
};

const money = (value: string | number, moneda: string): string =>
    Number(value ?? 0).toLocaleString('es-PE', { style: 'currency', currency: moneda });

export default function Index({
    moneda,
    periodo,
    periodo_label: periodoLabel,
    sede_id: sedeId,
    kpis,
    por_metodo: porMetodo,
    por_sede: porSede,
    fel,
    sedes,
}: Props) {
    const items = useMemo<DashboardKpiItem[]>(
        () => [
            {
                key: 'total',
                label: 'Ventas cobradas',
                value: money(kpis.ventas_total, moneda),
                hint: `${kpis.ventas_count} comprobantes de cobro`,
                icon: Wallet,
                accent: 'emerald',
            },
            {
                key: 'ticket',
                label: 'Ticket promedio',
                value: money(kpis.ticket_promedio, moneda),
                hint: periodoLabel,
                icon: Ticket,
                accent: 'brand',
            },
            {
                key: 'igv',
                label: 'IGV del periodo',
                value: money(kpis.igv_total, moneda),
                icon: Receipt,
                accent: 'sky',
            },
            {
                key: 'fel',
                label: 'CPE emitidos',
                value: fel.emitidos,
                hint:
                    fel.rechazados > 0
                        ? `${fel.rechazados} rechazados por SUNAT`
                        : `${fel.sin_cpe} tickets internos`,
                icon: Receipt,
                accent: fel.rechazados > 0 ? 'amber' : 'sky',
            },
        ],
        [fel, kpis, moneda, periodoLabel],
    );

    return (
        <>
            <Head title="Reporte financiero" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Caja y ventas"
                    description={`Ingresos cobrados · ${periodoLabel}. Las ventas anuladas no entran.`}
                />

                <ReporteFilters
                    routeUrl={financiero.index().url}
                    periodo={periodo}
                    sedeId={sedeId}
                    sedes={sedes}
                />

                <DashboardKpiGrid items={items} />

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Por método de pago</CardTitle>
                            <CardDescription>Según el cobro registrado en caja.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {porMetodo.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin ventas en este periodo.</p>
                            ) : (
                                <ul className="divide-y">
                                    {porMetodo.map((row) => (
                                        <li
                                            key={row.metodo}
                                            className="flex items-center justify-between py-2 text-sm"
                                        >
                                            <span>
                                                {row.label}
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {row.ventas}
                                                </span>
                                            </span>
                                            <span className="tabular-nums font-medium">
                                                {money(row.total, moneda)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Por sede</CardTitle>
                            <CardDescription>Total cobrado en cada sucursal.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {porSede.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin ventas en este periodo.</p>
                            ) : (
                                <ul className="divide-y">
                                    {porSede.map((row) => (
                                        <li
                                            key={row.sede_id}
                                            className="flex items-center justify-between py-2 text-sm"
                                        >
                                            <span>
                                                {row.sede_nombre}
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {row.ventas}
                                                </span>
                                            </span>
                                            <span className="tabular-nums font-medium">
                                                {money(row.total, moneda)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Reportes' },
        { title: 'Caja y ventas', href: '/reportes/financiero' },
    ],
};
