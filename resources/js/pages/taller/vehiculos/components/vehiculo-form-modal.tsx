import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef  } from 'react';
import type {FormEvent} from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import vehiculos from '@/routes/taller/vehiculos';
import type { ClienteOption, Vehiculo } from '../types';

export type VehiculoFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Vehículo a editar; si es `null` el modal se abre en modo crear. */
    vehiculo: Vehiculo | null;
    /** Catálogo de clientes pre-cargado desde el index. */
    clientes: readonly ClienteOption[];
};

type VehiculoFormData = {
    cliente_id: string;
    placa: string;
    marca: string;
    modelo: string;
    color: string;
    anio: string;
    kilometraje: string;
    vin: string;
};

const emptyForm: VehiculoFormData = {
    cliente_id: '',
    placa: '',
    marca: '',
    modelo: '',
    color: '',
    anio: '',
    kilometraje: '',
    vin: '',
};

const buildInitialData = (vehiculo: Vehiculo | null): VehiculoFormData => ({
    cliente_id: vehiculo?.cliente_id ?? '',
    placa: vehiculo?.placa ?? '',
    marca: vehiculo?.marca ?? '',
    modelo: vehiculo?.modelo ?? '',
    color: vehiculo?.color ?? '',
    anio: vehiculo?.anio ? String(vehiculo.anio) : '',
    kilometraje: vehiculo?.kilometraje != null ? String(vehiculo.kilometraje) : '',
    vin: vehiculo?.vin ?? '',
});

const isFormValid = (data: VehiculoFormData): boolean =>
    data.cliente_id.trim().length > 0 && data.placa.trim().length > 0;

/**
 * Modal de crear/editar vehículo.
 */
export function VehiculoFormModal({
    open,
    onOpenChange,
    vehiculo,
    clientes: clienteOptions,
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

        return (Object.keys(initial) as Array<keyof VehiculoFormData>).some(
            (key) => initial[key] !== data[key],
        );
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

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        if (isEdit && vehiculo) {
            put(vehiculos.update(vehiculo.id).url, {
                preserveScroll: true,
                onSuccess,
            });

            return;
        }

        post(vehiculos.store().url, {
            preserveScroll: true,
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
                        <Select
                            value={data.cliente_id}
                            onValueChange={(value) => setData('cliente_id', value)}
                        >
                            <SelectTrigger id="vehiculo-cliente" className="w-full cursor-pointer">
                                <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clienteOptions.map((cliente) => (
                                    <SelectItem
                                        key={cliente.id}
                                        value={cliente.id}
                                        className="cursor-pointer"
                                    >
                                        {cliente.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                </FormSection>

                <FormSection index={1} title="Datos del vehículo" columns={2}>
                    <FormField
                        id="vehiculo-placa"
                        label="Placa"
                        required
                        error={errors.placa}
                    >
                        <Input
                            id="vehiculo-placa"
                            value={data.placa}
                            onChange={(e) => setData('placa', e.target.value)}
                            placeholder="ABC-123"
                            autoComplete="off"
                            className="uppercase"
                        />
                    </FormField>

                    <FormField id="vehiculo-marca" label="Marca" error={errors.marca}>
                        <Input
                            id="vehiculo-marca"
                            value={data.marca}
                            onChange={(e) => setData('marca', e.target.value)}
                            placeholder="Toyota"
                            autoComplete="off"
                        />
                    </FormField>

                    <FormField id="vehiculo-modelo" label="Modelo" error={errors.modelo}>
                        <Input
                            id="vehiculo-modelo"
                            value={data.modelo}
                            onChange={(e) => setData('modelo', e.target.value)}
                            placeholder="Hilux"
                            autoComplete="off"
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
                            type="number"
                            value={data.anio}
                            onChange={(e) => setData('anio', e.target.value)}
                            placeholder="2020"
                            inputMode="numeric"
                        />
                    </FormField>

                    <FormField
                        id="vehiculo-kilometraje"
                        label="Kilometraje"
                        error={errors.kilometraje}
                    >
                        <Input
                            id="vehiculo-kilometraje"
                            type="number"
                            value={data.kilometraje}
                            onChange={(e) => setData('kilometraje', e.target.value)}
                            placeholder="45000"
                            inputMode="numeric"
                        />
                    </FormField>

                    <FormField
                        id="vehiculo-vin"
                        label="VIN"
                        error={errors.vin}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="vehiculo-vin"
                            value={data.vin}
                            onChange={(e) => setData('vin', e.target.value)}
                            placeholder="Número de identificación vehicular"
                            autoComplete="off"
                            className="uppercase"
                        />
                    </FormField>
                </FormSection>
            </div>
        </FormModal>
    );
}
