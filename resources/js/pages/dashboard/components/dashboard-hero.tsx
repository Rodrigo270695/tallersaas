import { LayoutDashboard } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types';
import type { DashboardSesion } from '../types';
import { DashboardCajaStatus } from './dashboard-caja-status';

export function DashboardHero({
    greeting,
    tallerLabel,
    hoyLabel,
    sesion,
}: {
    greeting: string;
    tallerLabel: string;
    hoyLabel: string;
    sesion: DashboardSesion;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const firstName = auth.user?.name?.trim().split(/\s+/)[0] ?? '';

    return (
        <section
            className="relative overflow-hidden rounded-2xl border border-brand-600/20 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-7 text-white shadow-lg shadow-brand-900/15 md:px-8"
            aria-label="Dashboard"
        >
            <div
                className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/10 blur-2xl"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-brand-400/25 blur-3xl"
                aria-hidden
            />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur-sm">
                        <LayoutDashboard className="size-3.5" aria-hidden />
                        Operación de hoy
                    </div>
                    <div>
                        <p className="text-sm font-medium text-brand-100/90">
                            {greeting}
                            {firstName !== '' ? `, ${firstName}` : ''}
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                            {tallerLabel}
                        </h1>
                        {hoyLabel !== '' && (
                            <p className="mt-2 text-sm capitalize text-brand-50/85">{hoyLabel}</p>
                        )}
                    </div>
                </div>
                <DashboardCajaStatus sesion={sesion} />
            </div>
        </section>
    );
}
