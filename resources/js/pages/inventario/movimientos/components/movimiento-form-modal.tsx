import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import movimientos from '@/routes/inventario/movimientos';
import type { ProductoMovimientoOption, SedeOption } from '../types';

type FormData = {
    producto_id: string;
    sede_id: string;
    tipo: 'entrada' | 'salida' | 'merma';
    cantidad: string;
    notas: string;
};

const TIPOS: ComboboxOption[] = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' },
    { value: 'merma', label: 'Merma' },
];

const isFormValid = (data: FormData): boolean =>
    data.producto_id !== '' &&
    data.sede_id !== '' &&
    data.tipo !== undefined &&
    Number(data.cantidad) > 0;

export function MovimientoFormModal({
    open,
    onOpenChange,
    productos,
    sedes,
    defaultSedeId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productos: readonly ProductoMovimientoOption[];
    sedes: readonly SedeOption[];
    defaultSedeId: string;
}) {
    const { data, setData, post, processing, errors, clearErrors } = useForm<FormData>({
        producto_id: '',
        sede_id: '',
        tipo: 'entrada',
        cantidad: '',
        notas: '',
    });

    const canSubmit = isFormValid(data) && !processing;

    const productoOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            productos.map((producto) => ({
                value: producto.id,
                label: producto.sku
                    ? `${producto.nombre} (${producto.sku})`
                    : producto.nombre,
            })),
        [productos],
    );

    const sedeOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            sedes.map((sede) => ({
                value: sede.id,
                label: sede.nombre,
            })),
        [sedes],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            producto_id: productos[0]?.id ?? '',
            sede_id: defaultSedeId || sedes[0]?.id || '',
            tipo: 'entrada',
            cantidad: '',
            notas: '',
        });
    }, [open, productos, sedes, defaultSedeId, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        post(movimientos.store().url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Registrar movimiento"
            description="Entrada aumenta stock. Salida y merma lo descuentan."
            size="md"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit || productos.length === 0 || sedes.length === 0}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Registrar
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Kardex" columns={2}>
                <FormField
                    id="mov-producto"
                    label="Repuesto"
                    required
                    error={errors.producto_id}
                    className="min-w-0 sm:col-span-2"
                >
                    <Combobox
                        id="mov-producto"
                        options={productoOptions}
                        value={data.producto_id || null}
                        onChange={(value) => setData('producto_id', value ?? '')}
                        placeholder="Elegir repuesto"
                        searchPlaceholder="Buscar repuesto…"
                        emptyMessage="Sin coincidencias."
                        clearable={false}
                        disabled={processing}
                        aria-invalid={Boolean(errors.producto_id)}
                    />
                </FormField>

                <FormField
                    id="mov-sede"
                    label="Sede"
                    required
                    error={errors.sede_id}
                    className="min-w-0"
                >
                    <Combobox
                        id="mov-sede"
                        options={sedeOptions}
                        value={data.sede_id || null}
                        onChange={(value) => setData('sede_id', value ?? '')}
                        placeholder="Selecciona sede"
                        searchPlaceholder="Buscar sede…"
                        emptyMessage="Sin coincidencias."
                        clearable={false}
                        disabled={processing}
                        aria-invalid={Boolean(errors.sede_id)}
                    />
                </FormField>

                <FormField
                    id="mov-tipo"
                    label="Tipo"
                    required
                    error={errors.tipo}
                    className="min-w-0"
                >
                    <Combobox
                        id="mov-tipo"
                        options={TIPOS}
                        value={data.tipo}
                        onChange={(value) =>
                            setData('tipo', (value as FormData['tipo']) ?? 'entrada')
                        }
                        placeholder="Tipo"
                        searchPlaceholder="Buscar tipo…"
                        emptyMessage="Sin coincidencias."
                        clearable={false}
                        disabled={processing}
                        aria-invalid={Boolean(errors.tipo)}
                    />
                </FormField>

                <FormField
                    id="mov-qty"
                    label="Cantidad"
                    required
                    error={errors.cantidad}
                    className="min-w-0 sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]"
                >
                    <Input
                        id="mov-qty"
                        type="number"
                        min="0.001"
                        step="0.001"
                        inputMode="decimal"
                        value={data.cantidad}
                        onChange={(e) => setData('cantidad', e.target.value)}
                        disabled={processing}
                    />
                </FormField>

                <FormField
                    id="mov-notas"
                    label="Notas"
                    error={errors.notas}
                    className="min-w-0 sm:col-span-2"
                >
                    <Textarea
                        id="mov-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={2}
                        disabled={processing}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}
