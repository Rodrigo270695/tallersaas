import { Head } from '@inertiajs/react';
import { ClipboardList, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { PageHeader } from '@/components/data-page';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DashboardKpiGrid,
    type DashboardKpiItem,
} from '@/pages/dashboard/components/dashboard-kpi-grid';
import ordenes from '@/routes/reportes/ordenes';
import { ReporteFilters, type ReportePeriodo, type SedeOption } from '../components/reporte-filters';

type EstadoCounts = {
    abierta: number;
    en_proceso: number;
    lista: number;
    entregada: number;
    anulada: number;
};

type Props = {
    periodo: ReportePeriodo;
    periodo_label: string;
    sede_id: string | null;
    snapshot: EstadoCounts;
    en_periodo: EstadoCounts;
    ingresadas: number;
    por_sede: { sede_id: string; sede_nombre: string; total: number }[];
    por_usuario: { user_id: string; nombre: string; total: number }[];
    sedes: readonly SedeOption[];
};

const ESTADO_LABEL: Record<keyof EstadoCounts, string> = {
    abierta: 'Abiertas',
    en_proceso: 'En proceso',
    lista: 'Listas',
    entregada: 'Entregadas',
    anulada: 'Anuladas',
};

export default function Index({
    periodo,
    periodo_label: periodoLabel,
    sede_id: sedeId,
    snapshot,
    en_periodo: enPeriodo,
    ingresadas,
    por_sede: porSede,
    por_usuario: porUsuario,
    sedes,
}: Props) {
    const items = useMemo<DashboardKpiItem[]>(
        () => [
            {
                key: 'taller',
                label: 'Ahora en taller',
                value: snapshot.abierta + snapshot.en_proceso,
                hint: `${snapshot.lista} listas para entregar`,
                icon: Wrench,
                accent: 'brand',
            },
            {
                key: 'ingresadas',
                label: 'Ingresadas en el periodo',
                value: ingresadas,
                hint: periodoLabel,
                icon: ClipboardList,
                accent: 'sky',
            },
            {
                key: 'listas',
                label: 'Listas (ahora)',
                value: snapshot.lista,
                icon: ClipboardList,
                accent: snapshot.lista > 0 ? 'amber' : 'sky',
                highlight: snapshot.lista > 0,
            },
            {
                key: 'entregadas',
                label: 'Entregadas en el periodo',
                value: enPeriodo.entregada,
                icon: ClipboardList,
                accent: 'emerald',
            },
        ],
        [enPeriodo.entregada, ingresadas, periodoLabel, snapshot],
    );

    return (
        <>
            <Head title="Reporte de órdenes" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Órdenes de trabajo"
                    description={`Estado actual del taller y lo ingresado · ${periodoLabel}.`}
                />

                <ReporteFilters
                    routeUrl={ordenes.index().url}
                    periodo={periodo}
                    sedeId={sedeId}
                    sedes={sedes}
                />

                <DashboardKpiGrid items={items} />

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Ingresos por estado</CardTitle>
                            <CardDescription>
                                Órdenes cuya fecha de ingreso cae en {periodoLabel.toLowerCase()}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {ingresadas === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin órdenes en este periodo.</p>
                            ) : (
                                <ul className="divide-y">
                                    {(Object.keys(ESTADO_LABEL) as (keyof EstadoCounts)[]).map((estado) => (
                                        <li
                                            key={estado}
                                            className="flex items-center justify-between py-2 text-sm"
                                        >
                                            <span>{ESTADO_LABEL[estado]}</span>
                                            <span className="tabular-nums font-medium">
                                                {enPeriodo[estado]}
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
                            <CardDescription>Órdenes abiertas en el periodo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {porSede.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin órdenes en este periodo.</p>
                            ) : (
                                <ul className="divide-y">
                                    {porSede.map((row) => (
                                        <li
                                            key={row.sede_id}
                                            className="flex items-center justify-between py-2 text-sm"
                                        >
                                            <span>{row.sede_nombre}</span>
                                            <span className="tabular-nums font-medium">{row.total}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">Quién abrió las OT</CardTitle>
                            <CardDescription>
                                Según el usuario que registró la orden. No es comisión de mecánico.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {porUsuario.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Nadie aparece como creador en este periodo.
                                </p>
                            ) : (
                                <ul className="divide-y">
                                    {porUsuario.map((row) => (
                                        <li
                                            key={row.user_id}
                                            className="flex items-center justify-between py-2 text-sm"
                                        >
                                            <span>{row.nombre}</span>
                                            <span className="tabular-nums font-medium">{row.total}</span>
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
        { title: 'Órdenes', href: '/reportes/ordenes' },
    ],
};
