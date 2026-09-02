import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import {
    GeoCascadeFields,
    type GeoCascadeValue,
} from '@/components/geo/geo-cascade-fields';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import sedes from '@/routes/configuracion/sedes';
import type { GeoOption, Sede } from '../types';

export type SedeFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sede: Sede | null;
    departamentos: readonly GeoOption[];
};

type SedeFormData = {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
    distrito_id: number | null;
    activa: boolean;
};

const emptyForm: SedeFormData = {
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    distrito_id: null,
    activa: true,
};

const buildInitialData = (sede: Sede | null): SedeFormData => ({
    nombre: sede?.nombre ?? '',
    direccion: sede?.direccion ?? '',
    telefono: sede?.telefono ?? '',
    email: sede?.email ?? '',
    distrito_id: sede?.distrito_id ?? null,
    activa: sede?.activa ?? true,
});

const buildInitialGeoValue = (sede: Sede | null): GeoCascadeValue => {
    if (!sede || !sede.distrito_model?.provincia) {
        return {
            departamento_id: null,
            provincia_id: null,
            distrito_id: sede?.distrito_id ?? null,
        };
    }

    return {
        departamento_id: sede.distrito_model.provincia.departamento_id,
        provincia_id: sede.distrito_model.provincia_id,
        distrito_id: sede.distrito_model.id,
    };
};

const isFormValid = (data: SedeFormData): boolean =>
    data.nombre.trim().length > 0 && data.distrito_id !== null;

export function SedeFormModal({
    open,
    onOpenChange,
    sede,
    departamentos,
}: SedeFormModalProps) {
    const isEdit = sede !== null;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<SedeFormData>(emptyForm);

    const [geo, setGeo] = useState<GeoCascadeValue>(() =>
        buildInitialGeoValue(null),
    );

    const canSubmit = isFormValid(data) && !processing;
    const initialSnapshotRef = useRef<SedeFormData>(emptyForm);

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(sede);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof SedeFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            setGeo(buildInitialGeoValue(sede));
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sede?.id]);

    const handleGeoChange = (next: GeoCascadeValue) => {
        setGeo(next);
        setData('distrito_id', next.distrito_id);
    };

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;

        return (Object.keys(initial) as Array<keyof SedeFormData>).some(
            (key) => initial[key] !== data[key],
        );
    }, [data]);

    const confirmDiscard = (): boolean => {
        if (!isDirty) {
            return true;
        }

        return window.confirm(
            'Hay cambios sin guardar. ¿Quieres descartarlos?',
        );
    };

    const handleClose = (next: boolean) => {
        if (!next) {
            if (!confirmDiscard()) {
                return;
            }
            reset();
            setGeo({
                departamento_id: null,
                provincia_id: null,
                distrito_id: null,
            });
            clearErrors();
        }
        onOpenChange(next);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const onSuccess = () => {
            reset();
            setGeo({
                departamento_id: null,
                provincia_id: null,
                distrito_id: null,
            });
            clearErrors();
            onOpenChange(false);
        };

        if (isEdit && sede) {
            put(sedes.update(sede.id).url, {
                preserveScroll: true,
                onSuccess,
            });

            return;
        }

        post(sedes.store().url, {
            preserveScroll: true,
            onSuccess,
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? 'Editar sede' : 'Nueva sede'}
            description={
                isEdit
                    ? 'Actualiza los datos de esta sucursal del taller.'
                    : 'Registra una sucursal. El código se genera automáticamente.'
            }
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isEdit ? 'Guardar cambios' : 'Crear sede'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title="Datos de la sede"
                    description={
                        isEdit
                            ? `Código ${sede?.codigo}`
                            : 'El código (SEDE-001, SEDE-002…) se asigna al guardar.'
                    }
                    columns={2}
                >
                    <FormField
                        id="sede-nombre"
                        label="Nombre"
                        required
                        error={errors.nombre}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="sede-nombre"
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            placeholder="Sede principal"
                            autoComplete="off"
                            autoFocus
                        />
                    </FormField>

                    <FormField
                        id="sede-telefono"
                        label="Teléfono"
                        error={errors.telefono}
                    >
                        <Input
                            id="sede-telefono"
                            value={data.telefono}
                            onChange={(e) => setData('telefono', e.target.value)}
                            placeholder="987654321"
                            autoComplete="tel"
                        />
                    </FormField>

                    <FormField
                        id="sede-email"
                        label="Correo"
                        error={errors.email}
                    >
                        <Input
                            id="sede-email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="sede@tallersaas.pe"
                            autoComplete="email"
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title="Ubicación"
                    description="Departamento, provincia y distrito del catálogo oficial (INEI)."
                    columns={1}
                >
                    <FormField
                        id="sede-direccion"
                        label="Dirección"
                        error={errors.direccion}
                    >
                        <Input
                            id="sede-direccion"
                            value={data.direccion}
                            onChange={(e) => setData('direccion', e.target.value)}
                            placeholder="Av. Arequipa 1234"
                            autoComplete="street-address"
                        />
                    </FormField>

                    <GeoCascadeFields
                        departamentos={departamentos}
                        value={geo}
                        onChange={handleGeoChange}
                        disabled={processing}
                        required
                        errors={{ distrito_id: errors.distrito_id }}
                    />
                </FormSection>

                <FormSection index={2} title="Estado">
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30">
                        <Checkbox
                            id="sede-activa"
                            checked={data.activa}
                            onCheckedChange={(checked) =>
                                setData('activa', checked === true)
                            }
                            className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">Sede activa</span>
                            <span className="text-xs text-muted-foreground">
                                Las sedes inactivas no aparecen al crear órdenes de trabajo.
                            </span>
                        </div>
                    </label>
                    {errors.activa && (
                        <p className="text-xs text-destructive">{errors.activa}</p>
                    )}
                </FormSection>
            </div>
        </FormModal>
    );
}
