import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import servicios from '@/routes/taller/servicios';
import type { CategoriaOption, Servicio } from '../types';

type FormData = {
    categoria_id: string;
    nombre: string;
    descripcion: string;
    precio: string;
    duracion_minutos: string;
    activo: boolean;
};

const isFormValid = (data: FormData): boolean =>
    data.nombre.trim().length > 0 && data.precio.trim() !== '' && Number(data.precio) >= 0;

export function ServicioFormModal({
    open,
    onOpenChange,
    servicio,
    categorias,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    servicio: Servicio | null;
    categorias: readonly CategoriaOption[];
}) {
    const isEdit = servicio !== null;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm<FormData>({
        categoria_id: '',
        nombre: '',
        descripcion: '',
        precio: '',
        duracion_minutos: '',
        activo: true,
    });

    const canSubmit = isFormValid(data) && !processing;

    const categoriaOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            categorias.map((cat) => ({
                value: cat.id,
                label: cat.nombre,
            })),
        [categorias],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            categoria_id: servicio?.categoria_id ?? '',
            nombre: servicio?.nombre ?? '',
            descripcion: servicio?.descripcion ?? '',
            precio: servicio?.precio != null ? String(servicio.precio) : '',
            duracion_minutos:
                servicio?.duracion_minutos != null ? String(servicio.duracion_minutos) : '',
            activo: servicio?.activo ?? true,
        });
    }, [open, servicio, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const opts = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit && servicio) {
            put(servicios.update(servicio.id).url, opts);

            return;
        }

        post(servicios.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
            size="lg"
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
            <FormSection index={0} title="Datos" columns={2}>
                <FormField
                    id="s-nombre"
                    label="Nombre"
                    required
                    error={errors.nombre}
                    className="min-w-0 sm:col-span-2"
                >
                    <Input
                        id="s-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoFocus
                        disabled={processing}
                    />
                </FormField>

                <FormField
                    id="s-cat"
                    label="Categoría"
                    error={errors.categoria_id}
                    className="min-w-0"
                >
                    <Combobox
                        id="s-cat"
                        options={categoriaOptions}
                        value={data.categoria_id || null}
                        onChange={(value) => setData('categoria_id', value ?? '')}
                        placeholder="Sin categoría"
                        searchPlaceholder="Buscar categoría…"
                        emptyMessage="Sin coincidencias."
                        clearable
                        disabled={processing}
                        aria-invalid={Boolean(errors.categoria_id)}
                    />
                </FormField>

                <FormField
                    id="s-precio"
                    label="Precio"
                    required
                    error={errors.precio}
                    className="min-w-0"
                >
                    <Input
                        id="s-precio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio}
                        onChange={(e) => setData('precio', e.target.value)}
                        disabled={processing}
                    />
                </FormField>

                <FormField
                    id="s-dur"
                    label="Duración (minutos)"
                    error={errors.duracion_minutos}
                    className="min-w-0"
                >
                    <Input
                        id="s-dur"
                        type="number"
                        min="1"
                        step="1"
                        value={data.duracion_minutos}
                        onChange={(e) => setData('duracion_minutos', e.target.value)}
                        disabled={processing}
                    />
                </FormField>

                <FormField id="s-activo" label="Estado" className="min-w-0">
                    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3">
                        <Checkbox
                            checked={data.activo}
                            onCheckedChange={(checked) => setData('activo', checked === true)}
                            disabled={processing}
                        />
                        <span className="text-sm">Servicio activo</span>
                    </label>
                </FormField>

                <FormField
                    id="s-desc"
                    label="Descripción"
                    error={errors.descripcion}
                    className="min-w-0 sm:col-span-2"
                >
                    <Textarea
                        id="s-desc"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        rows={2}
                        disabled={processing}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}
