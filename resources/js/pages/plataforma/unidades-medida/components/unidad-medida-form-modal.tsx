import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import unidadesMedida from '@/routes/plataforma/unidades-medida';
import type { UnidadMedida } from '../types';

type FormData = {
    codigo: string;
    nombre: string;
    orden: string;
    activo: boolean;
};

const isFormValid = (data: FormData): boolean =>
    data.codigo.trim().length > 0 && data.nombre.trim().length > 0;

export function UnidadMedidaFormModal({
    open,
    onOpenChange,
    unidad,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unidad: UnidadMedida | null;
}) {
    const isEdit = unidad !== null;
    const { data, setData, post, put, processing, errors, clearErrors } =
        useForm<FormData>({
            codigo: '',
            nombre: '',
            orden: '0',
            activo: true,
        });

    const canSubmit = isFormValid(data) && !processing;

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            codigo: unidad?.codigo ?? '',
            nombre: unidad?.nombre ?? '',
            orden: unidad ? String(unidad.orden) : '0',
            activo: unidad?.activo ?? true,
        });
    }, [open, unidad, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const opts = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit && unidad) {
            put(unidadesMedida.update(unidad.id).url, opts);

            return;
        }

        post(unidadesMedida.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar unidad' : 'Nueva unidad'}
            description="Catálogo global: todos los talleres verán esta unidad."
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
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar' : 'Crear'}
                    </Button>
                </>
            }
        >
            <FormSection index={0} title="Unidad" columns={2}>
                <FormField id="um-codigo" label="Código" required error={errors.codigo}>
                    <Input
                        id="um-codigo"
                        value={data.codigo}
                        onChange={(e) =>
                            setData('codigo', e.target.value.toUpperCase().replace(/\s+/g, ''))
                        }
                        disabled={isEdit || processing}
                        placeholder="Ej. UN"
                        autoFocus={!isEdit}
                    />
                </FormField>
                <FormField id="um-orden" label="Orden" error={errors.orden}>
                    <Input
                        id="um-orden"
                        type="number"
                        min="0"
                        value={data.orden}
                        onChange={(e) => setData('orden', e.target.value)}
                        disabled={processing}
                    />
                </FormField>
                <FormField
                    id="um-nombre"
                    label="Nombre"
                    required
                    error={errors.nombre}
                    className="sm:col-span-2"
                >
                    <Input
                        id="um-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        placeholder="Ej. Unidad"
                        autoFocus={isEdit}
                        disabled={processing}
                    />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                    <Checkbox
                        checked={data.activo}
                        onCheckedChange={(checked) => setData('activo', checked === true)}
                        disabled={processing}
                    />
                    <span className="text-sm">Unidad activa</span>
                </label>
            </FormSection>
        </FormModal>
    );
}
