import { Head, Link } from '@inertiajs/react';
import { Building2, CreditCard, Layers, LayoutDashboard } from 'lucide-react';
import { dashboard } from '@/routes';
import planes from '@/routes/plataforma/planes';
import suscripciones from '@/routes/plataforma/suscripciones';
import tenants from '@/routes/plataforma/tenants';
import { DashboardKpiGrid } from './components/dashboard-kpi-grid';
import type { DashboardCentralProps } from './types';

export default function DashboardCentral({ stats }: DashboardCentralProps) {
    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <section className="relative overflow-hidden rounded-2xl border border-brand-600/20 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-7 text-white shadow-lg shadow-brand-900/15 md:px-8">
                    <div
                        className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/10 blur-2xl"
                        aria-hidden
                    />
                    <div className="relative space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
                            <LayoutDashboard className="size-3.5" aria-hidden />
                            Plataforma
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">TallerSaaS</h1>
                        <p className="max-w-xl text-sm text-brand-50/85">
                            Panel central: talleres, planes y suscripciones.
                        </p>
                    </div>
                </section>

                <DashboardKpiGrid
                    items={[
                        {
                            key: 'activos',
                            label: 'Talleres activos',
                            value: stats.talleres_activos,
                            hint: 'Trial, activos y en gracia',
                            href: tenants.index().url,
                            icon: Building2,
                            accent: 'emerald',
                        },
                        {
                            key: 'total',
                            label: 'Talleres en total',
                            value: stats.talleres_total,
                            href: tenants.index().url,
                            icon: Layers,
                            accent: 'brand',
                        },
                    ]}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                    <Link
                        href={tenants.index().url}
                        className="rounded-xl border border-border/80 bg-card p-4 text-sm font-medium shadow-sm hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
                    >
                        Talleres
                    </Link>
                    <Link
                        href={planes.index().url}
                        className="rounded-xl border border-border/80 bg-card p-4 text-sm font-medium shadow-sm hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
                    >
                        Planes
                    </Link>
                    <Link
                        href={suscripciones.index().url}
                        className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-4 text-sm font-medium shadow-sm hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
                    >
                        <CreditCard className="size-4" aria-hidden />
                        Suscripciones
                    </Link>
                </div>
            </div>
        </>
    );
}

DashboardCentral.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
