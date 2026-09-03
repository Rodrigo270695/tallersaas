import { useMemo } from 'react';
import {
    AgendaMonthCalendar,
    monthRangeFromMes,
    shiftMes,
    type AgendaEvent,
} from '@/components/agenda/agenda-month-calendar';
import type { Cita, CitaEstado } from '../types';

type Props = {
    citas: readonly Cita[];
    mes: string;
    timeZone: string;
    horaInicio: string;
    horaFin: string;
    isLoading?: boolean;
    canCreate: boolean;
    canUpdate?: boolean;
    onSelectCita: (cita: Cita) => void;
    onScheduleDay: (fecha: string, hora?: string) => void;
    onReschedule?: (cita: Cita, fecha: string, hora?: string) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onJumpToMonth: (mes: string) => void;
    onToday: () => void;
};

const RESCHEDULABLE = new Set<CitaEstado>(['programada', 'confirmada', 'en_recepcion']);

function canDragCita(cita: Cita, canUpdate: boolean): boolean {
    return canUpdate && RESCHEDULABLE.has(cita.estado);
}

export function getEstadoAccent(estado: CitaEstado | string): string {
    switch (estado) {
        case 'en_recepcion':
            return 'border-l-sky-500 bg-sky-100/90 text-sky-900 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-100';
        case 'confirmada':
        case 'programada':
            return 'border-l-amber-500 bg-amber-50/90 text-amber-950 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-100';
        case 'convertida':
            return 'border-l-emerald-500 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100';
        case 'cancelada':
        case 'no_asistio':
            return 'border-l-rose-500 bg-rose-50/80 text-rose-800 line-through opacity-90 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-100';
        default:
            return 'border-l-brand-400 bg-brand-50/80 text-brand-900';
    }
}

export function displayClienteCita(cita: Cita): string {
    if (!cita.cliente) {
        return '—';
    }

    return [cita.cliente.nombres, cita.cliente.apellidos].filter(Boolean).join(' ') || '—';
}

export function CitasCalendar({
    citas,
    mes,
    timeZone,
    horaInicio,
    horaFin,
    isLoading,
    canCreate,
    canUpdate = false,
    onSelectCita,
    onScheduleDay,
    onReschedule,
    onPrevMonth,
    onNextMonth,
    onJumpToMonth,
    onToday,
}: Props) {
    const citasById = useMemo(
        () => new Map(citas.map((c) => [c.id, c])),
        [citas],
    );

    const events = useMemo(
        (): AgendaEvent[] =>
            citas.map((cita) => ({
                id: cita.id,
                inicio_at: cita.inicia_at,
                duracion_minutos: cita.duracion_minutos,
                title: cita.vehiculo?.placa
                    ? `${cita.vehiculo.placa} · ${displayClienteCita(cita)}`
                    : displayClienteCita(cita),
                subtitle: cita.asignado_a?.name ?? cita.motivo ?? null,
                accentClass: getEstadoAccent(cita.estado),
                tone: 'cita',
                canDrag: canDragCita(cita, canUpdate),
            })),
        [citas, canUpdate],
    );

    const legend = useMemo(
        () => [
            { key: 'programada', swatch: 'bg-amber-400', label: 'Programada' },
            { key: 'en_recepcion', swatch: 'bg-sky-500', label: 'En recepción' },
            { key: 'convertida', swatch: 'bg-emerald-500', label: 'Convertida' },
            { key: 'cancelada', swatch: 'bg-rose-500', label: 'Cancelada' },
        ],
        [],
    );

    const labels = useMemo(
        () => ({
            today: 'Hoy',
            prevMonth: 'Mes anterior',
            nextMonth: 'Mes siguiente',
            pickMonth: 'Mes',
            pickYear: 'Año',
            more: 'más',
            dayAgenda: 'Agenda del día',
            dayEmpty: 'Sin citas programadas',
            dayCount: (count: number) =>
                count === 1 ? '1 cita' : `${count} citas`,
            scheduleDay: 'Agendar día',
            scheduleAt: (hour: string) => `Agendar a las ${hour}`,
            clickDayHint: 'Clic en un día para ver la agenda',
            expandDay: 'Ampliar',
            expandDayTitle: 'Agenda ampliada',
            durationMin: (minutes: number) => `${minutes} min`,
            until: 'hasta',
            now: 'Ahora',
            dragHint: 'Arrastra para reprogramar',
            weekdays: {
                mon: 'LUN',
                tue: 'MAR',
                wed: 'MIÉ',
                thu: 'JUE',
                fri: 'VIE',
                sat: 'SÁB',
                sun: 'DOM',
            },
        }),
        [],
    );

    return (
        <AgendaMonthCalendar
            events={events}
            mes={mes}
            timeZone={timeZone}
            horaInicio={horaInicio}
            horaFin={horaFin}
            isLoading={isLoading}
            canCreate={canCreate}
            canUpdate={canUpdate}
            legend={legend}
            labels={labels}
            onSelectEvent={(event) => {
                const cita = citasById.get(event.id);
                if (cita) {
                    onSelectCita(cita);
                }
            }}
            onScheduleDay={onScheduleDay}
            onReschedule={
                onReschedule
                    ? (event, fecha, hora) => {
                          const cita = citasById.get(event.id);
                          if (cita) {
                              onReschedule(cita, fecha, hora);
                          }
                      }
                    : undefined
            }
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onJumpToMonth={onJumpToMonth}
            onToday={onToday}
        />
    );
}

export { monthRangeFromMes, shiftMes };
