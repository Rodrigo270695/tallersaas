/** Clases compartidas para pills de estado (con ring para más color). */

export const ordenEstadoBadgeClass = {
    abierta: 'bg-sky-100 text-sky-900 ring-1 ring-sky-300/80',
    en_proceso: 'bg-amber-100 text-amber-950 ring-1 ring-amber-300/80',
    lista: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80',
    entregada: 'bg-violet-100 text-violet-900 ring-1 ring-violet-300/80',
    anulada: 'bg-rose-100 text-rose-900 ring-1 ring-rose-300/80',
} as const;

export const presupuestoEstadoBadgeClass = {
    borrador: 'bg-stone-100 text-stone-800 ring-1 ring-stone-300/80',
    enviado: 'bg-sky-100 text-sky-900 ring-1 ring-sky-300/80',
    aprobado: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80',
    rechazado: 'bg-rose-100 text-rose-900 ring-1 ring-rose-300/80',
    vencido: 'bg-amber-100 text-amber-950 ring-1 ring-amber-300/80',
    convertido: 'bg-violet-100 text-violet-900 ring-1 ring-violet-300/80',
} as const;

export const ventaEstadoBadgeClass = {
    pendiente: 'bg-amber-100 text-amber-950 ring-1 ring-amber-300/80',
    pagado: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80',
    parcial: 'bg-orange-100 text-orange-950 ring-1 ring-orange-300/80',
    anulado: 'bg-rose-100 text-rose-900 ring-1 ring-rose-300/80',
} as const;

export const cajaEstadoBadgeClass = {
    abierta: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80',
    cerrada: 'bg-stone-100 text-stone-700 ring-1 ring-stone-300/80',
} as const;

export const felEstadoBadgeClass = {
    emitido: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80',
    rechazado: 'bg-rose-100 text-rose-900 ring-1 ring-rose-300/80',
    pendiente: 'bg-amber-100 text-amber-950 ring-1 ring-amber-300/80',
    default: 'bg-stone-100 text-stone-600 ring-1 ring-stone-300/70',
} as const;

export const statusPillClass =
    'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
