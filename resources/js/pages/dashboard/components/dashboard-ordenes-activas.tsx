import { Link } from '@inertiajs/react';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import type { DashboardOrdenActiva } from '../types';

const ESTADO_LABEL: Record<string, string> = {
    abierta: 'Abierta',
    en_proceso: 'En proceso',
    lista: 'Lista',
};

const estadoClass: Record<string, string> = {
    abierta: 'bg-sky-50 text-sky-800',
    en_proceso: 'bg-amber-50 text-amber-800',
    lista: 'bg-emerald-50 text-emerald-800',
};

const money = (value: string | number): string =>
    Number(value ?? 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

export function DashboardOrdenesActivas({
    items,
    canCreate,
}: {
    items: readonly DashboardOrdenActiva[];
    canCreate: boolean;
}) {
    return (
        <Card className="min-w-0 border-border/80 py-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/50 px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                        <ClipboardList className="size-4" aria-hidden />
                    </div>
                    <CardTitle className="text-base font-semibold">Órdenes en taller</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-brand-700 hover:text-brand-800" asChild>
                    <Link href={ordenesTrabajo.index().url}>
                        Ver órdenes
                        <ChevronRight className="ml-1 size-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="px-6 py-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 py-10 text-center">
                        <ClipboardList className="size-8 text-muted-foreground/50" aria-hidden />
                        <p className="text-sm text-muted-foreground">No hay órdenes abiertas ni listas.</p>
                        {canCreate && (
                            <Button size="sm" className="mt-1 cursor-pointer" asChild>
                                <Link href={ordenesTrabajo.index().url}>Nueva orden</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map((orden) => (
                            <li
                                key={orden.id}
                                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="font-mono text-sm font-medium">{orden.numero}</p>
                                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                        {[orden.vehiculo_placa, orden.cliente_nombre].filter(Boolean).join(' · ') ||
                                            '—'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estadoClass[orden.estado] ?? 'bg-muted'}`}
                                    >
                                        {ESTADO_LABEL[orden.estado] ?? orden.estado}
                                    </span>
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                        Saldo {money(orden.saldo)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
