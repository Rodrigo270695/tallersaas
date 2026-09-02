import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import categorias from '@/routes/taller/categorias-servicios';
import type { CategoriaServicio } from '../types';

type FormData = {
    nombre: string;
    descripcion: string;
    activo: boolean;
};

export function CategoriaFormModal({
    open,
    onOpenChange,
    categoria,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoria: CategoriaServicio | null;
}) {
    const isEdit = categoria !== null;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm<FormData>({
        nombre: '',
        descripcion: '',
        activo: true,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            nombre: categoria?.nombre ?? '',
            descripcion: categoria?.descripcion ?? '',
            activo: categoria?.activo ?? true,
        });
    }, [open, categoria, clearErrors, setData]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit && categoria) {
            put(categorias.update(categoria.id).url, opts);

            return;
        }

        post(categorias.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
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
            <FormSection index={0} title="Categoría" columns={1}>
                <FormField id="cat-nombre" label="Nombre" required error={errors.nombre}>
                    <Input
                        id="cat-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoFocus
                    />
                </FormField>
                <FormField id="cat-desc" label="Descripción" error={errors.descripcion}>
                    <Textarea
                        id="cat-desc"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        rows={2}
                    />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                        checked={data.activo}
                        onCheckedChange={(checked) => setData('activo', checked === true)}
                    />
                    <span className="text-sm">Categoría activa</span>
                </label>
            </FormSection>
        </FormModal>
    );
}
