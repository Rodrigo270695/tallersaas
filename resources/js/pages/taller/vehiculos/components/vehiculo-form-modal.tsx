import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import {
    CreatableEntityCombobox,
    FormField,
    FormModal,
    FormSection,
    soloDigitosDocumento,
} from '@/components/forms';
import { ImageCaptureField } from '@/components/media/image-capture-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import marcas from '@/routes/taller/marcas';
import modelos from '@/routes/taller/modelos';
import vehiculos from '@/routes/taller/vehiculos';
import type { ClienteOption, MarcaOption, ModeloOption, Vehiculo } from '../types';

export type VehiculoFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Vehículo a editar; si es `null` el modal se abre en modo crear. */
    vehiculo: Vehiculo | null;
    /** Catálogo de clientes pre-cargado desde el index. */
    clientes: readonly ClienteOption[];
    /** Catálogo de marcas del tenant (base + creadas por el taller). */
    marcas: readonly MarcaOption[];
    /** Catálogo de modelos del tenant, cada uno ligado a su marca. */
    modelos: readonly ModeloOption[];
};

type VehiculoFormData = {
    cliente_id: string;
    placa: string;
    marca_id: string;
    modelo_id: string;
    color: string;
    anio: string;
    kilometraje: string;
    vin: string;
    foto: File | null;
    clear_foto: boolean;
};

const emptyForm: VehiculoFormData = {
    cliente_id: '',
    placa: '',
    marca_id: '',
    modelo_id: '',
    color: '',
    anio: '',
    kilometraje: '',
    vin: '',
    foto: null,
    clear_foto: false,
};

const buildInitialData = (vehiculo: Vehiculo | null): VehiculoFormData => ({
    cliente_id: vehiculo?.cliente_id ?? '',
    placa: vehiculo?.placa ?? '',
    marca_id: vehiculo?.marca_id ?? '',
    modelo_id: vehiculo?.modelo_id ?? '',
    color: vehiculo?.color ?? '',
    anio: vehiculo?.anio ? String(vehiculo.anio) : '',
    kilometraje: vehiculo?.kilometraje != null ? String(vehiculo.kilometraje) : '',
    vin: vehiculo?.vin ?? '',
    foto: null,
    clear_foto: false,
});

const isFormValid = (data: VehiculoFormData): boolean =>
    data.cliente_id.trim().length > 0 && data.placa.trim().length > 0;

/** Placa peruana: letras, números y guión, en mayúsculas. */
const soloPlacaMayusculas = (value: string): string =>
    value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();

/** VIN/chasis: solo letras y números (sin espacios ni guiones), en mayúsculas. */
const soloVinMayusculas = (value: string): string =>
    value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

/**
 * Modal de crear/editar vehículo.
 */
export function VehiculoFormModal({
    open,
    onOpenChange,
    vehiculo,
    clientes: clienteOptions,
    marcas: marcaOptions,
    modelos: modeloOptions,
}: VehiculoFormModalProps) {
    const isEdit = vehiculo !== null;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<VehiculoFormData>(emptyForm);

    const canSubmit = isFormValid(data) && !processing;
    const initialSnapshotRef = useRef<VehiculoFormData>(emptyForm);

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(vehiculo);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof VehiculoFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, vehiculo?.id]);

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;

        return (Object.keys(initial) as Array<keyof VehiculoFormData>).some((key) => {
            if (key === 'foto') {
                return data.foto instanceof File || data.clear_foto !== initial.clear_foto;
            }

            return initial[key] !== data[key];
        });
    }, [data]);

    const confirmDiscard = (): boolean => {
        if (!isDirty) {
            return true;
        }

        return window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?');
    };

    const handleClose = (next: boolean) => {
        if (!next) {
            if (!confirmDiscard()) {
                return;
            }

            reset();
            clearErrors();
        }

        onOpenChange(next);
    };

    /** Cascada: al cambiar (o limpiar) la marca, el modelo elegido deja de ser válido. */
    const handleMarcaChange = (value: string | null) => {
        setData((prev) => ({ ...prev, marca_id: value ?? '', modelo_id: '' }));
    };

    const modelosDeLaMarca = useMemo(
        () => modeloOptions.filter((modelo) => modelo.marca_id === data.marca_id),
        [modeloOptions, data.marca_id],
    );

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        const hasNewFoto = data.foto instanceof File;
        const forceFormData = isEdit || hasNewFoto || data.clear_foto;

        if (isEdit && vehiculo) {
            put(vehiculos.update(vehiculo.id).url, {
                preserveScroll: true,
                forceFormData,
                onSuccess,
            });

            return;
        }

        post(vehiculos.store().url, {
            preserveScroll: true,
            forceFormData: hasNewFoto,
            onSuccess,
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? 'Editar vehículo' : 'Nuevo vehículo'}
            description={
                isEdit
                    ? 'Actualiza los datos de este vehículo.'
                    : 'Registra un vehículo asociado a un cliente.'
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
                        {isEdit ? 'Guardar cambios' : 'Crear vehículo'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title="Propietario"
                    description="Cliente al que pertenece este vehículo."
                >
                    <FormField
                        id="vehiculo-cliente"
                        label="Cliente"
                        required
                        error={errors.cliente_id}
                    >
                        <Combobox
                            id="vehiculo-cliente"
                            options={clienteOptions.map((cliente) => ({
                                value: cliente.id,
                                label: cliente.nombre,
                            }))}
                            value={data.cliente_id || null}
                            onChange={(value) => setData('cliente_id', value ?? '')}
                            placeholder="Selecciona un cliente"
                            searchPlaceholder="Buscar cliente…"
                            emptyMessage="No se encontró ningún cliente."
                            clearable={false}
                            aria-invalid={Boolean(errors.cliente_id)}
                        />
                    </FormField>
                </FormSection>

                <FormSection index={1} title="Marca y modelo" columns={2}>
                    <FormField id="vehiculo-marca" label="Marca" error={errors.marca_id}>
                        <CreatableEntityCombobox
                            id="vehiculo-marca"
                            options={marcaOptions}
                            value={data.marca_id || null}
                            onChange={handleMarcaChange}
                            createUrl={marcas.store().url}
                            optionsPropKey="marcas"
                            placeholder="Busca o selecciona marca…"
                            searchPlaceholder="Buscar marca…"
                            emptyMessage="Sin resultados."
                            createOptionLabel={(query) => `Usar «${query.toUpperCase()}»`}
                            invalid={Boolean(errors.marca_id)}
                        />
                    </FormField>

                    <FormField id="vehiculo-modelo" label="Modelo" error={errors.modelo_id}>
                        <CreatableEntityCombobox
                            id="vehiculo-modelo"
                            options={modelosDeLaMarca}
                            value={data.modelo_id || null}
                            onChange={(value) => setData('modelo_id', value ?? '')}
                            createUrl={modelos.store().url}
                            extraPayload={{ marca_id: data.marca_id }}
                            optionsPropKey="modelos"
                            disabled={!data.marca_id}
                            placeholder={
                                data.marca_id
                                    ? 'Busca o selecciona modelo…'
                                    : 'Selecciona una marca'
                            }
                            searchPlaceholder="Buscar modelo…"
                            emptyMessage="Sin resultados."
                            createOptionLabel={(query) => `Usar «${query.toUpperCase()}»`}
                            invalid={Boolean(errors.modelo_id)}
                        />
                    </FormField>
                </FormSection>

                <FormSection index={2} title="Datos del vehículo" columns={2}>
                    <FormField
                        id="vehiculo-foto"
                        label="Foto del vehículo"
                        error={errors.foto}
                        className="sm:col-span-2"
                    >
                        <ImageCaptureField
                            id="vehiculo-foto"
                            value={data.foto instanceof File ? data.foto : null}
                            existingUrl={vehiculo?.foto_url ?? null}
                            clearExisting={data.clear_foto}
                            disabled={processing}
                            onChange={(file) => {
                                setData('foto', file);
                                if (file) {
                                    setData('clear_foto', false);
                                }
                            }}
                        />
                        {isEdit && Boolean(vehiculo?.foto_url) ? (
                            <div className="mt-3 flex items-center gap-3">
                                <Checkbox
                                    id="vehiculo-clear-foto"
                                    checked={data.clear_foto}
                                    disabled={data.foto instanceof File}
                                    onCheckedChange={(checked) => {
                                        const on = checked === true;
                                        setData('clear_foto', on);
                                        if (on) {
                                            setData('foto', null);
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="vehiculo-clear-foto"
                                    className="cursor-pointer text-sm text-muted-foreground"
                                >
                                    Quitar foto actual
                                </label>
                            </div>
                        ) : null}
                    </FormField>

                    <FormField
                        id="vehiculo-placa"
                        label="Placa"
                        required
                        error={errors.placa}
                        hint="Solo letras, números y guión."
                    >
                        <Input
                            id="vehiculo-placa"
                            value={data.placa}
                            onChange={(e) =>
                                setData('placa', soloPlacaMayusculas(e.target.value))
                            }
                            placeholder="ABC-123"
                            autoComplete="off"
                            maxLength={10}
                        />
                    </FormField>

                    <FormField id="vehiculo-color" label="Color" error={errors.color}>
                        <Input
                            id="vehiculo-color"
                            value={data.color}
                            onChange={(e) => setData('color', e.target.value)}
                            placeholder="Blanco"
                            autoComplete="off"
                        />
                    </FormField>

                    <FormField id="vehiculo-anio" label="Año" error={errors.anio}>
                        <Input
                            id="vehiculo-anio"
                            value={data.anio}
                            onChange={(e) =>
                                setData('anio', soloDigitosDocumento(e.target.value, 4))
                            }
                            placeholder="2020"
                            inputMode="numeric"
                            autoComplete="off"
                        />
                    </FormField>

                    <FormField
                        id="vehiculo-kilometraje"
                        label="Kilometraje"
                        error={errors.kilometraje}
                    >
                        <Input
                            id="vehiculo-kilometraje"
                            value={data.kilometraje}
                            onChange={(e) =>
                                setData(
                                    'kilometraje',
                                    soloDigitosDocumento(e.target.value, 7),
                                )
                            }
                            placeholder="45000"
                            inputMode="numeric"
                            autoComplete="off"
                        />
                    </FormField>

                    <FormField
                        id="vehiculo-vin"
                        label="VIN"
                        error={errors.vin}
                        className="sm:col-span-2"
                        hint="Número de identificación vehicular (chasis): letras y números, sin espacios."
                    >
                        <Input
                            id="vehiculo-vin"
                            value={data.vin}
                            onChange={(e) =>
                                setData(
                                    'vin',
                                    soloVinMayusculas(e.target.value).slice(0, 30),
                                )
                            }
                            placeholder="1HGCM82633A004352"
                            autoComplete="off"
                        />
                    </FormField>
                </FormSection>
            </div>
        </FormModal>
    );
}
