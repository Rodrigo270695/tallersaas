import { Link, usePage } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';

export type TenantPlanChip = {
    nombre: string;
    codigo: string;
    badge: string | null;
    color_hex: string | null;
    estado: string;
    ciclo: string | null;
};

const FALLBACK: Record<string, string> = {
    free: '#78716c',
    gratis: '#78716c',
    basico: '#0369a1',
    pro: '#1e3a5f',
    experto: '#7c3aed',
};

const HEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function expandHex(value: string): string {
    if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
        const [r, g, b] = value.slice(1).split('');

        return `#${r}${r}${g}${g}${b}${b}`;
    }

    return value;
}

export function planColor(codigo: string, colorHex: string | null | undefined): string {
    if (colorHex && HEX.test(colorHex.trim())) {
        return expandHex(colorHex.trim());
    }

    return FALLBACK[codigo] ?? '#1e3a5f';
}

export function PlanMark({
    nombre,
    codigo,
    badge,
    colorHex,
    compact = false,
}: {
    nombre: string;
    codigo?: string;
    badge?: string | null;
    colorHex?: string | null;
    compact?: boolean;
}) {
    const color = planColor(codigo ?? '', colorHex);
    const label = badge?.trim() || nombre;

    return (
        <span className={compact ? 'inline-flex items-center gap-2' : 'flex min-w-0 items-center gap-2'}>
            <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase"
                style={{ backgroundColor: color }}
            >
                <Sparkles className="size-3" />
                {label}
            </span>
            {!compact ? (
                <span className="truncate text-xs font-medium text-foreground">Plan {nombre}</span>
            ) : null}
        </span>
    );
}

export function TenantPlanBadge() {
    const plan = usePage().props.tenant_plan as TenantPlanChip | null | undefined;

    if (!plan) {
        return null;
    }

    const color = planColor(plan.codigo, plan.color_hex);

    return (
        <Link
            href="/configuracion/suscripcion"
            className="group-data-[collapsible=icon]:hidden mx-2 mb-1 flex items-center rounded-lg px-2 py-1.5 ring-1 ring-black/5 transition-colors hover:bg-muted/60"
            style={{ backgroundColor: `${color}18` }}
        >
            <PlanMark
                nombre={plan.nombre}
                codigo={plan.codigo}
                badge={plan.badge}
                colorHex={plan.color_hex}
            />
        </Link>
    );
}
