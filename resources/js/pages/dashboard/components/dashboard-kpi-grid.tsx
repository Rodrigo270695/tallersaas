import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KpiAccent = 'brand' | 'sky' | 'emerald' | 'amber';

export type DashboardKpiItem = {
    key: string;
    label: string;
    value: string | number;
    hint?: string;
    href?: string;
    icon: LucideIcon;
    accent?: KpiAccent;
    highlight?: boolean;
};

const accentStyles: Record<KpiAccent, { card: string; icon: string; value: string }> = {
    brand: {
        card: 'border-brand-200/60 bg-gradient-to-br from-brand-50/80 to-card dark:from-brand-950/30',
        icon: 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200',
        value: 'text-brand-900 dark:text-brand-100',
    },
    sky: {
        card: 'border-sky-200/50 bg-gradient-to-br from-sky-50/70 to-card dark:from-sky-950/25',
        icon: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
        value: 'text-sky-950 dark:text-sky-100',
    },
    emerald: {
        card: 'border-emerald-200/50 bg-gradient-to-br from-emerald-50/70 to-card dark:from-emerald-950/25',
        icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
        value: 'text-emerald-950 dark:text-emerald-100',
    },
    amber: {
        card: 'border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-card dark:from-amber-950/30',
        icon: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        value: 'text-amber-950 dark:text-amber-100',
    },
};

export function DashboardKpiGrid({ items }: { items: DashboardKpiItem[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
                const Icon = item.icon;
                const accent = item.accent ?? 'brand';
                const styles = accentStyles[accent];
                const inner = (
                    <article
                        className={cn(
                            'relative overflow-hidden rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md',
                            styles.card,
                            item.highlight && 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-background',
                            item.href && 'cursor-pointer',
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                <p
                                    className={cn(
                                        'mt-1.5 text-2xl font-bold tracking-tight tabular-nums',
                                        styles.value,
                                    )}
                                >
                                    {item.value}
                                </p>
                                {item.hint ? (
                                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                                        {item.hint}
                                    </p>
                                ) : null}
                            </div>
                            <span
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                    styles.icon,
                                )}
                            >
                                <Icon className="size-4" aria-hidden />
                            </span>
                        </div>
                    </article>
                );

                if (item.href) {
                    return (
                        <Link key={item.key} href={item.href} className="block min-w-0">
                            {inner}
                        </Link>
                    );
                }

                return (
                    <div key={item.key} className="min-w-0">
                        {inner}
                    </div>
                );
            })}
        </div>
    );
}
