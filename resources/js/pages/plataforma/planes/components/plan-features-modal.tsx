import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import planes from '@/routes/plataforma/planes';
import type { FeatureCatalogItem, Plan } from '../types';

const FEATURE_LABEL: Record<string, string> = {
    max_sedes: 'Máx. sedes',
    max_usuarios: 'Máx. usuarios',
    max_clientes: 'Máx. clientes',
    max_vehiculos: 'Máx. vehículos',
    max_productos: 'Máx. productos',
    boletas_electronicas: 'Boletas electrónicas',
    facturas_electronicas: 'Facturas electrónicas',
    guias_remision: 'Guías de remisión',
    max_comprobantes_mes: 'Máx. comprobantes / mes',
};

type FeatureForm = {
    feature: string;
    valor_int: string;
    valor_bool: boolean | null;
    valor_str: string;
};

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
    const { data, setData, put, processing, reset } = useForm<{
        features: FeatureForm[];
    }>({ features: [] });

    useEffect(() => {
        if (!open || !plan) {
            return;
        }

        const current = new Map(
            (plan.features ?? []).map((row) => [row.feature, row]),
        );

        setData(
            'features',
            catalog.map((item) => {
                const row = current.get(item.feature);

                return {
                    feature: item.feature,
                    valor_int:
                        row?.valor_int !== null && row?.valor_int !== undefined
                            ? String(row.valor_int)
                            : item.type === 'int' && typeof item.default === 'number'
                              ? String(item.default)
                              : '',
                    valor_bool:
                        row?.valor_bool ??
                        (item.type === 'bool' && typeof item.default === 'boolean'
                            ? item.default
                            : false),
                    valor_str: row?.valor_str ?? '',
                };
            }),
        );
    }, [open, plan, catalog, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!plan) {
            return;
        }

        put(planes.updateFeatures(plan.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={plan ? `Funcionalidades · ${plan.nombre}` : 'Funcionalidades'}
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing || !plan} className="cursor-pointer gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Guardar
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-3">
                {catalog.map((item, index) => {
                    const row = data.features[index];
                    if (!row) {
                        return null;
                    }

                    return (
                        <div
                            key={item.feature}
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                        >
                            <Label className="text-sm">
                                {FEATURE_LABEL[item.feature] ?? item.feature}
                            </Label>
                            {item.type === 'bool' ? (
                                <Checkbox
                                    checked={row.valor_bool === true}
                                    onCheckedChange={(checked) => {
                                        const next = [...data.features];
                                        next[index] = {
                                            ...row,
                                            valor_bool: checked === true,
                                        };
                                        setData('features', next);
                                    }}
                                />
                            ) : (
                                <Input
                                    className="w-28"
                                    type={item.type === 'int' ? 'number' : 'text'}
                                    value={
                                        item.type === 'int' ? row.valor_int : row.valor_str
                                    }
                                    onChange={(e) => {
                                        const next = [...data.features];
                                        next[index] =
                                            item.type === 'int'
                                                ? { ...row, valor_int: e.target.value }
                                                : { ...row, valor_str: e.target.value };
                                        setData('features', next);
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </FormModal>
    );
}
