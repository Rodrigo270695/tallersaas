import { Head } from '@inertiajs/react';
import { CalendarDays, ClipboardList, Receipt, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { dashboard } from '@/routes';
import sesiones from '@/routes/caja/sesiones';
import ventas from '@/routes/caja/ventas';
import citas from '@/routes/taller/citas';
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import { DashboardCitasHoy } from './components/dashboard-citas-hoy';
import { DashboardHero } from './components/dashboard-hero';
import { DashboardOnboardingCard } from './components/dashboard-onboarding-card';
import { DashboardKpiGrid, type DashboardKpiItem } from './components/dashboard-kpi-grid';
import { DashboardOrdenesActivas } from './components/dashboard-ordenes-activas';
import {
    DashboardQuickActions,
    type QuickActionItem,
} from './components/dashboard-quick-actions';
import type { DashboardIndexProps } from './types';

const money = (value: string | number, moneda: string): string => {
    const n = Number(value ?? 0);

    try {
        return n.toLocaleString('es-PE', { style: 'currency', currency: moneda });
    } catch {
        return `${moneda} ${n.toFixed(2)}`;
    }
};

export default function DashboardIndex({
    taller_label: tallerLabel,
    capabilities,
    onboarding,
    moneda,
    hoy_label: hoyLabel,
    greeting,
    kpis,
    citas_hoy: citasHoy,
    ordenes_activas: ordenesActivas,
    mi_sesion: miSesion,
}: DashboardIndexProps) {
    const kpiItems = useMemo<DashboardKpiItem[]>(() => {
        const items: DashboardKpiItem[] = [];

        if (capabilities.citas) {
            items.push({
                key: 'citas',
                label: 'Citas hoy',
                value: kpis.citas_hoy,
                hint:
                    kpis.citas_pendientes_hoy === 1
                        ? '1 pendiente de recepción'
                        : `${kpis.citas_pendientes_hoy} pendientes de recepción`,
                href: citas.index().url,
                icon: CalendarDays,
                accent: 'sky',
            });
        }

        if (capabilities.ordenes) {
            items.push({
                key: 'ot-abiertas',
                label: 'OT en taller',
                value: kpis.ot_abiertas,
                hint: 'Abiertas y en proceso',
                href: ordenesTrabajo.index().url,
                icon: Wrench,
                accent: 'brand',
            });
            items.push({
                key: 'ot-listas',
                label: 'Listas para entregar',
                value: kpis.ot_listas,
                hint: kpis.ot_listas > 0 ? 'Avisar al cliente' : 'Ningún vehículo listo',
                href: `${ordenesTrabajo.index().url}?estado=lista`,
                icon: ClipboardList,
                accent: 'amber',
                highlight: kpis.ot_listas > 0,
            });
        }

        if (capabilities.ventas) {
            items.push({
                key: 'ventas',
                label: 'Caja del día',
                value: money(kpis.ventas_hoy_total, moneda),
                hint:
                    kpis.ventas_hoy_count === 1
                        ? '1 cobro'
                        : `${kpis.ventas_hoy_count} cobros`,
                href: ventas.index().url,
                icon: Receipt,
                accent: 'emerald',
            });
        }

        return items;
    }, [capabilities, kpis, moneda]);

    const quickActions = useMemo<QuickActionItem[]>(() => {
        const items: QuickActionItem[] = [];

        if (capabilities.citas_create) {
            items.push({
                key: 'cita',
                label: 'Agendar cita',
                href: citas.index().url,
                icon: CalendarDays,
                accent: 'sky',
            });
        }

        if (capabilities.ordenes_create) {
            items.push({
                key: 'ot',
                label: 'Nueva orden de trabajo',
                href: ordenesTrabajo.index().url,
                icon: Wrench,
                accent: 'brand',
            });
        }

        if (capabilities.caja) {
            items.push({
                key: 'caja',
                label: miSesion ? 'Ir a caja' : 'Abrir caja',
                href: sesiones.index().url,
                icon: Receipt,
                accent: 'emerald',
            });
        }

        return items;
    }, [capabilities, miSesion]);

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <DashboardHero
                    greeting={greeting}
                    tallerLabel={tallerLabel}
                    hoyLabel={hoyLabel}
                    sesion={capabilities.caja ? miSesion : null}
                />

                {onboarding?.show && <DashboardOnboardingCard data={onboarding} />}

                <DashboardKpiGrid items={kpiItems} />

                <div className="grid gap-4 lg:grid-cols-3">
                    {capabilities.citas && (
                        <div className={quickActions.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
                            <DashboardCitasHoy items={citasHoy} canCreate={capabilities.citas_create} />
                        </div>
                    )}
                    {quickActions.length > 0 && <DashboardQuickActions items={quickActions} />}
                    {capabilities.ordenes && (
                        <div className="lg:col-span-3">
                            <DashboardOrdenesActivas
                                items={ordenesActivas}
                                canCreate={capabilities.ordenes_create}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

DashboardIndex.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
