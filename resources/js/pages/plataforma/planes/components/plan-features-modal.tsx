import { router } from '@inertiajs/react';
import {
    ChevronDown,
    Infinity as InfinityIcon,
    Loader2,
    RotateCcw,
    Search,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';
import { cn } from '@/lib/utils';
import planes from '@/routes/plataforma/planes';
import type { FeatureCatalogItem, Plan } from '../types';

const GROUP_LABEL: Record<string, string> = {
    limites: 'Features',
    facturacion: 'Facturación electrónica',
};

const FEATURE_HINT: Record<string, string> = {
    max_sedes: 'Cantidad máxima de sedes (−1 = ilimitado).',
    max_usuarios: 'Cantidad máxima de usuarios del taller.',
    max_clientes: 'Cantidad máxima de clientes registrados.',
    max_vehiculos: 'Cantidad máxima de vehículos registrados.',
    max_productos: 'Cantidad máxima de productos en inventario.',
    boletas_electronicas: 'Puede emitir boletas electrónicas.',
    facturas_electronicas: 'Puede emitir facturas electrónicas a clientes con RUC.',
    guias_remision: 'Puede emitir guías de remisión electrónicas.',
    max_comprobantes_mes: 'Cantidad máxima de comprobantes electrónicos por mes (−1 = ilimitado).',
};

type FeatureValue = {
    valor_int: number | null;
    valor_bool: boolean | null;
    valor_str: string | null;
};

const emptyValue = (): FeatureValue => ({
    valor_int: null,
    valor_bool: null,
    valor_str: null,
});

function isActive(value: FeatureValue | undefined): boolean {
    return Boolean(value && (value.valor_int !== null || value.valor_bool !== null || value.valor_str !== null));
}

export function PlanFeaturesModal({
    open,
    onOpenChange,
    plan,
    catalog,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: Plan | null;
    catalog: readonly FeatureCatalogItem[];
}) {
    const [values, setValues] = useState<Record<string, FeatureValue>>({});
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);
    const { remember, requestClose, dirty } = useUnsavedFormGuard(values, onOpenChange);

    const groups = useMemo(() => {
        const map = new Map<string, FeatureCatalogItem[]>();

        for (const item of catalog) {
            const list = map.get(item.group) ?? [];
            list.push(item);
            map.set(item.group, list);
        }

        return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
    }, [catalog]);

    useEffect(() => {
        if (!open || !plan) {
            return;
        }

        const current = new Map((plan.features ?? []).map((row) => [row.feature, row]));
        const initial: Record<string, FeatureValue> = {};

        for (const item of catalog) {
            const row = current.get(item.feature);
            initial[item.feature] = row
                ? {
                      valor_int: row.valor_int,
                      valor_bool: row.valor_bool,
                      valor_str: row.valor_str,
                  }
                : emptyValue();
        }

        setValues(initial);
        remember(initial);
        setQuery('');
        setExpanded(new Set(groups.map((group) => group.group)));
    }, [open, plan, catalog, groups, remember]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (!needle) {
            return groups;
        }

        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) =>
                        item.feature.toLowerCase().includes(needle) ||
                        (FEATURE_HINT[item.feature] ?? '').toLowerCase().includes(needle),
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [groups, query]);

    const activeCount = useMemo(() => Object.values(values).filter((value) => isActive(value)).length, [values]);

    const onSave = () => {
        if (!plan) {
            return;
        }

        const features = Object.entries(values)
            .filter(([, value]) => isActive(value))
            .map(([feature, value]) => ({
                feature,
                valor_int: value.valor_int,
                valor_bool: value.valor_bool,
                valor_str: value.valor_str,
            }));

        setProcessing(true);
        router.put(
            planes.updateFeatures(plan.id).url,
            { features },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => onOpenChange(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={requestClose}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                <DialogHeader className="border-b border-border/60 px-5 pt-5 pb-3">
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="size-4" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-base font-semibold tracking-tight">
                                Gestionar features
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {plan ? <span className="font-mono text-foreground/80">{plan.codigo}</span> : null}
                                {plan ? ' · ' : null}
                                Define los features que incluye este plan
                                {' · '}
                                <span className="font-semibold text-primary">
                                    {activeCount} {activeCount === 1 ? 'feature activa' : 'features activas'}
                                </span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="border-b border-border/60 bg-muted/30 px-5 py-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar feature…"
                            className="pl-9"
                        />
                        {query ? (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                                aria-label="Limpiar búsqueda"
                            >
                                <X className="size-4" strokeWidth={2.5} />
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                    {filtered.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">Ningún feature coincide con la búsqueda.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filtered.map(({ group, items }) => {
                                const openGroup = expanded.has(group);
                                const groupActive = items.filter((item) => isActive(values[item.feature])).length;

                                return (
                                    <section key={group} className="overflow-hidden rounded-lg border border-border/60">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpanded((current) => {
                                                    const next = new Set(current);
                                                    if (next.has(group)) {
                                                        next.delete(group);
                                                    } else {
                                                        next.add(group);
                                                    }

                                                    return next;
                                                })
                                            }
                                            className="flex w-full cursor-pointer items-center justify-between gap-2 bg-muted/30 px-3 py-2 text-left text-sm font-semibold hover:bg-muted/50"
                                        >
                                            <span className="flex items-center gap-2">
                                                <ChevronDown
                                                    className={cn('size-4 transition-transform', !openGroup && '-rotate-90')}
                                                    strokeWidth={2.5}
                                                />
                                                {GROUP_LABEL[group] ?? group}
                                            </span>
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {groupActive}/{items.length}
                                            </span>
                                        </button>
                                        {openGroup ? (
                                            <div className="flex flex-col divide-y divide-border/40">
                                                {items.map((item) => (
                                                    <FeatureRow
                                                        key={item.feature}
                                                        item={item}
                                                        value={values[item.feature] ?? emptyValue()}
                                                        onChange={(partial) =>
                                                            setValues((current) => ({
                                                                ...current,
                                                                [item.feature]: { ...emptyValue(), ...partial },
                                                            }))
                                                        }
                                                        onClear={() =>
                                                            setValues((current) => ({
                                                                ...current,
                                                                [item.feature]: emptyValue(),
                                                            }))
                                                        }
                                                        onApplyDefault={() =>
                                                            setValues((current) => ({
                                                                ...current,
                                                                [item.feature]: defaultValue(item),
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        ) : null}
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-border/60 px-5 py-3">
                    <Button type="button" variant="outline" className="cursor-pointer" disabled={processing} onClick={() => requestClose(false)}>
                        Cancelar
                    </Button>
                    <Button type="button" className="cursor-pointer gap-2" disabled={processing || !dirty || !plan} onClick={onSave}>
                        {processing ? <Loader2 className="size-4 animate-spin" /> : null}
                        Guardar features
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function defaultValue(item: FeatureCatalogItem): FeatureValue {
    if (item.type === 'int' && typeof item.default === 'number') {
        return { ...emptyValue(), valor_int: item.default };
    }

    if (item.type === 'bool' && typeof item.default === 'boolean') {
        return { ...emptyValue(), valor_bool: item.default };
    }

    if (item.type === 'str' && typeof item.default === 'string') {
        return { ...emptyValue(), valor_str: item.default };
    }

    return emptyValue();
}

function FeatureRow({
    item,
    value,
    onChange,
    onClear,
    onApplyDefault,
}: {
    item: FeatureCatalogItem;
    value: FeatureValue;
    onChange: (partial: Partial<FeatureValue>) => void;
    onClear: () => void;
    onApplyDefault: () => void;
}) {
    const active = isActive(value);

    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-mono text-xs font-semibold text-primary">{item.feature}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                    {FEATURE_HINT[item.feature] ?? 'Feature del plan.'}
                </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                {item.type === 'bool' ? (
                    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                        <Checkbox
                            checked={value.valor_bool === true}
                            onCheckedChange={(checked) => onChange({ valor_bool: checked === true })}
                        />
                        <span className="text-xs">{value.valor_bool === true ? 'Activo' : 'Inactivo'}</span>
                    </label>
                ) : null}
                {item.type === 'int' ? (
                    <div className="flex items-center gap-1">
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={value.valor_int ?? ''}
                            placeholder="—"
                            aria-label={item.feature}
                            className="h-9 w-24 font-mono"
                            onChange={(event) => {
                                const raw = event.target.value.trim();

                                if (raw === '' || raw === '-') {
                                    onChange({ valor_int: null });

                                    return;
                                }

                                if (/^-?\d+$/.test(raw)) {
                                    onChange({ valor_int: Number(raw) });
                                }
                            }}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 cursor-pointer text-amber-600 hover:text-amber-700"
                            aria-label="Ilimitado"
                            title="Ilimitado"
                            onClick={() => onChange({ valor_int: -1 })}
                        >
                            <InfinityIcon className="size-4" strokeWidth={2.5} />
                        </Button>
                    </div>
                ) : null}
                {item.type === 'str' ? (
                    <Input
                        value={value.valor_str ?? ''}
                        placeholder="—"
                        aria-label={item.feature}
                        className="h-9 w-40"
                        onChange={(event) => onChange({ valor_str: event.target.value === '' ? null : event.target.value })}
                    />
                ) : null}
                {active ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 cursor-pointer text-muted-foreground hover:text-destructive"
                        aria-label="Quitar feature"
                        onClick={onClear}
                    >
                        <X className="size-4" strokeWidth={2.5} />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 cursor-pointer text-muted-foreground hover:text-primary"
                        aria-label="Aplicar valor por defecto"
                        onClick={onApplyDefault}
                    >
                        <RotateCcw className="size-4" strokeWidth={2.5} />
                    </Button>
                )}
            </div>
        </div>
    );
}
