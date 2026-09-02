import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

const NONE = '__none__';

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
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
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
                    className="sm:col-span-2"
                >
                    <Input
                        id="s-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoFocus
                    />
                </FormField>
                <FormField id="s-cat" label="Categoría" error={errors.categoria_id}>
                    <Select
                        value={data.categoria_id || NONE}
                        onValueChange={(value) =>
                            setData('categoria_id', value === NONE ? '' : value)
                        }
                    >
                        <SelectTrigger id="s-cat">
                            <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE}>Sin categoría</SelectItem>
                            {categorias.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="s-precio" label="Precio" required error={errors.precio}>
                    <Input
                        id="s-precio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.precio}
                        onChange={(e) => setData('precio', e.target.value)}
                    />
                </FormField>
                <FormField id="s-dur" label="Duración (minutos)" error={errors.duracion_minutos}>
                    <Input
                        id="s-dur"
                        type="number"
                        min="1"
                        step="1"
                        value={data.duracion_minutos}
                        onChange={(e) => setData('duracion_minutos', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="s-desc"
                    label="Descripción"
                    error={errors.descripcion}
                    className="sm:col-span-2"
                >
                    <Textarea
                        id="s-desc"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        rows={2}
                    />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                    <Checkbox
                        checked={data.activo}
                        onCheckedChange={(checked) => setData('activo', checked === true)}
                    />
                    <span className="text-sm">Servicio activo</span>
                </label>
            </FormSection>
        </FormModal>
    );
}
