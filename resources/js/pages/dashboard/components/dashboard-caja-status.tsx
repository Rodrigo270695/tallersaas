import { DoorClosed, DoorOpen } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import sesiones from '@/routes/caja/sesiones';
import type { DashboardSesion } from '../types';

export function DashboardCajaStatus({ sesion }: { sesion: DashboardSesion }) {
    const abierta = sesion !== null;

    return (
        <Link
            href={sesiones.index().url}
            className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm backdrop-blur-sm',
                abierta
                    ? 'border-white/25 bg-white/15 text-white hover:bg-white/20'
                    : 'border-white/20 bg-black/15 text-brand-50 hover:bg-black/20',
            )}
        >
            <div
                className={cn(
                    'flex size-9 items-center justify-center rounded-lg',
                    abierta ? 'bg-emerald-400/30 text-white' : 'bg-white/10 text-brand-100',
                )}
            >
                {abierta ? (
                    <DoorOpen className="size-4" aria-hidden />
                ) : (
                    <DoorClosed className="size-4" aria-hidden />
                )}
            </div>
            <div>
                <p className="font-medium">{abierta ? 'Caja abierta' : 'Caja cerrada'}</p>
                <p className="text-xs opacity-80">
                    {abierta
                        ? sesion.sede_nombre
                            ? `Sesión en ${sesion.sede_nombre}`
                            : 'Tu sesión está activa'
                        : 'Abre caja para cobrar'}
                </p>
            </div>
        </Link>
    );
}
