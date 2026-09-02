import { Link } from '@inertiajs/react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import citas from '@/routes/taller/citas';
import type { DashboardCitaHoy } from '../types';

const ESTADO_LABEL: Record<string, string> = {
    programada: 'Programada',
    confirmada: 'Confirmada',
    en_recepcion: 'En recepción',
};

const estadoDot: Record<string, string> = {
    programada: 'bg-sky-500',
    confirmada: 'bg-amber-500',
    en_recepcion: 'bg-violet-500',
};

const formatHora = (iso: string | null): string => {
    if (!iso) {
        return '—';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

export function DashboardCitasHoy({
    items,
    canCreate,
}: {
    items: readonly DashboardCitaHoy[];
    canCreate: boolean;
}) {
    return (
        <Card className="min-w-0 border-border/80 py-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/50 px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                        <CalendarDays className="size-4" aria-hidden />
                    </div>
                    <CardTitle className="text-base font-semibold">Citas de hoy</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-brand-700 hover:text-brand-800" asChild>
                    <Link href={citas.index().url}>
                        Ver agenda
                        <ChevronRight className="ml-1 size-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="px-6 py-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 py-10 text-center">
                        <CalendarDays className="size-8 text-muted-foreground/50" aria-hidden />
                        <p className="text-sm text-muted-foreground">No hay recepciones pendientes hoy.</p>
                        {canCreate && (
                            <Button size="sm" className="mt-1 cursor-pointer" asChild>
                                <Link href={citas.index().url}>Agendar cita</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map((cita) => (
                            <li
                                key={cita.id}
                                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <span
                                        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${estadoDot[cita.estado] ?? 'bg-muted-foreground'}`}
                                        aria-hidden
                                    />
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground">
                                            {cita.vehiculo_placa ?? 'Sin placa'}
                                            {cita.cliente_nombre ? (
                                                <span className="font-normal text-muted-foreground">
                                                    {' '}
                                                    · {cita.cliente_nombre}
                                                </span>
                                            ) : null}
                                        </p>
                                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                            {[ESTADO_LABEL[cita.estado] ?? cita.estado, cita.motivo, cita.sede_nombre]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>
                                </div>
                                <p className="shrink-0 text-sm font-medium tabular-nums sm:text-right">
                                    {formatHora(cita.inicia_at)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
