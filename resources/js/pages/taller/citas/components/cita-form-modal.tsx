import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import citas from '@/routes/taller/citas';
import type {
    Cita,
    CitaEstado,
    ClienteOption,
    MecanicoOption,
    SedeOption,
    VehiculoOption,
} from '../types';

const NONE = '__ninguno__';

const ESTADOS_EDITABLES: { value: CitaEstado; label: string }[] = [
    { value: 'programada', label: 'Programada' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'en_recepcion', label: 'En recepción' },
    { value: 'no_asistio', label: 'No asistió' },
    { value: 'cancelada', label: 'Cancelada' },
];

type FormData = {
    sede_id: string;
    cliente_id: string;
    vehiculo_id: string;
    assigned_user_id: string;
    inicia_at: string;
    duracion_minutos: string;
    estado: CitaEstado;
    motivo: string;
    notas: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

const toDatetimeLocal = (iso: string | null): string => {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const nextHourLocal = (): string => {
    const date = new Date();
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);

    return toDatetimeLocal(date.toISOString());
};

export function CitaFormModal({
    open,
    onOpenChange,
    cita,
    sedes,
    clientes,
    vehiculos,
    mecanicos,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cita: Cita | null;
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    mecanicos: readonly MecanicoOption[];
}) {
    const isEdit = cita !== null;
    const locked = cita?.estado === 'convertida';

    const { data, setData, post, put, processing, errors, clearErrors } = useForm<FormData>({
        sede_id: '',
        cliente_id: '',
        vehiculo_id: '',
        assigned_user_id: '',
        inicia_at: '',
        duracion_minutos: '60',
        estado: 'programada',
        motivo: '',
        notas: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            sede_id: cita?.sede_id ?? (sedes.length === 1 ? sedes[0].id : ''),
            cliente_id: cita?.cliente_id ?? '',
            vehiculo_id: cita?.vehiculo_id ?? '',
            assigned_user_id: cita?.assigned_user_id ?? '',
            inicia_at: cita ? toDatetimeLocal(cita.inicia_at) : nextHourLocal(),
            duracion_minutos: String(cita?.duracion_minutos ?? 60),
            estado: cita?.estado === 'convertida' ? 'programada' : (cita?.estado ?? 'programada'),
            motivo: cita?.motivo ?? '',
            notas: cita?.notas ?? '',
        });
    }, [open, cita, sedes, clearErrors, setData]);

    const vehiculosFiltrados = useMemo(
        () => vehiculos.filter((vehiculo) => vehiculo.cliente_id === data.cliente_id),
        [vehiculos, data.cliente_id],
    );

    const canSubmit =
        !processing &&
        !locked &&
        data.sede_id.length > 0 &&
        data.cliente_id.length > 0 &&
        data.vehiculo_id.length > 0 &&
        data.inicia_at.length > 0;

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        const opts = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (isEdit && cita) {
            put(citas.update(cita.id).url, opts);

            return;
        }

        post(citas.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar cita' : 'Nueva cita'}
            description={
                locked
                    ? 'Esta cita ya se convirtió en orden de trabajo.'
                    : 'Agenda la recepción del vehículo.'
            }
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
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar' : 'Crear cita'}
                    </Button>
                </>
            }
        >
            {sedes.length === 0 && (
                <p
                    className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    role="alert"
                >
                    Primero crea una sede en Configuración → Sedes.
                </p>
            )}

            <div className="flex flex-col gap-5">
                <FormSection index={0} title="Cliente y vehículo" columns={2}>
                    <FormField id="cita-sede" label="Sede" required error={errors.sede_id}>
                        <Select
                            value={data.sede_id || undefined}
                            onValueChange={(value) => setData('sede_id', value)}
                            disabled={locked}
                        >
                            <SelectTrigger id="cita-sede" className="w-full">
                                <SelectValue placeholder="Selecciona sede" />
                            </SelectTrigger>
                            <SelectContent>
                                {sedes.map((sede) => (
                                    <SelectItem key={sede.id} value={sede.id}>
                                        {sede.nombre} ({sede.codigo})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField id="cita-cliente" label="Cliente" required error={errors.cliente_id}>
                        <Select
                            value={data.cliente_id || undefined}
                            onValueChange={(value) => {
                                setData('cliente_id', value);
                                setData('vehiculo_id', '');
                            }}
                            disabled={locked}
                        >
                            <SelectTrigger id="cita-cliente" className="w-full">
                                <SelectValue placeholder="Selecciona cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clientes.map((cliente) => (
                                    <SelectItem key={cliente.id} value={cliente.id}>
                                        {cliente.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField
                        id="cita-vehiculo"
                        label="Vehículo"
                        required
                        error={errors.vehiculo_id}
                        className="sm:col-span-2"
                    >
                        <Select
                            value={data.vehiculo_id || undefined}
                            onValueChange={(value) => setData('vehiculo_id', value)}
                            disabled={locked || !data.cliente_id}
                        >
                            <SelectTrigger id="cita-vehiculo" className="w-full">
                                <SelectValue
                                    placeholder={
                                        data.cliente_id
                                            ? 'Selecciona vehículo'
                                            : 'Primero el cliente'
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {vehiculosFiltrados.map((vehiculo) => (
                                    <SelectItem key={vehiculo.id} value={vehiculo.id}>
                                        {vehiculo.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                </FormSection>

                <FormSection index={1} title="Agenda" columns={2}>
                    <FormField id="cita-inicio" label="Fecha y hora" required error={errors.inicia_at}>
                        <Input
                            id="cita-inicio"
                            type="datetime-local"
                            value={data.inicia_at}
                            onChange={(e) => setData('inicia_at', e.target.value)}
                            disabled={locked}
                        />
                    </FormField>
                    <FormField id="cita-dur" label="Duración (minutos)" error={errors.duracion_minutos}>
                        <Input
                            id="cita-dur"
                            type="number"
                            min={15}
                            max={480}
                            step={15}
                            value={data.duracion_minutos}
                            onChange={(e) => setData('duracion_minutos', e.target.value)}
                            disabled={locked}
                        />
                    </FormField>
                    {isEdit && (
                        <FormField id="cita-estado" label="Estado" error={errors.estado}>
                            <Select
                                value={data.estado}
                                onValueChange={(value) => setData('estado', value as CitaEstado)}
                                disabled={locked}
                            >
                                <SelectTrigger id="cita-estado" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ESTADOS_EDITABLES.map((estado) => (
                                        <SelectItem key={estado.value} value={estado.value}>
                                            {estado.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    )}
                    <FormField id="cita-mec" label="Mecánico" error={errors.assigned_user_id}>
                        <Select
                            value={data.assigned_user_id || NONE}
                            onValueChange={(value) =>
                                setData('assigned_user_id', value === NONE ? '' : value)
                            }
                            disabled={locked}
                        >
                            <SelectTrigger id="cita-mec" className="w-full">
                                <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Sin asignar</SelectItem>
                                {mecanicos.map((mecanico) => (
                                    <SelectItem key={mecanico.id} value={mecanico.id}>
                                        {mecanico.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField
                        id="cita-motivo"
                        label="Motivo"
                        error={errors.motivo}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="cita-motivo"
                            value={data.motivo}
                            onChange={(e) => setData('motivo', e.target.value)}
                            placeholder="Cambio de aceite, frenos…"
                            disabled={locked}
                        />
                    </FormField>
                    <FormField
                        id="cita-notas"
                        label="Notas"
                        error={errors.notas}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="cita-notas"
                            value={data.notas}
                            onChange={(e) => setData('notas', e.target.value)}
                            rows={2}
                            disabled={locked}
                        />
                    </FormField>
                </FormSection>
            </div>
        </FormModal>
    );
}
