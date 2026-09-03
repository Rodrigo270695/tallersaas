import { useForm, usePage } from '@inertiajs/react';
import { Loader2, Wrench } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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
import type { Auth } from '@/types';
import type {
    Cita,
    CitaEstado,
    ClienteOption,
    MecanicoOption,
    SedeOption,
    VehiculoOption,
} from '../types';

const NONE = '__ninguno__';
const DURACION_DEFAULT = '60';
const ACTIVAS = new Set(['programada', 'confirmada', 'en_recepcion']);

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
    prefill,
    onConvert,
    canConvert = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cita: Cita | null;
    sedes: readonly SedeOption[];
    clientes: readonly ClienteOption[];
    vehiculos: readonly VehiculoOption[];
    mecanicos: readonly MecanicoOption[];
    prefill?: { fecha?: string; hora?: string } | null;
    onConvert?: (cita: Cita) => void;
    canConvert?: boolean;
}) {
    const isEdit = cita !== null;
    const locked = cita?.estado === 'convertida';
    const puedeAbrirOt =
        isEdit &&
        cita !== null &&
        canConvert &&
        Boolean(onConvert) &&
        ACTIVAS.has(cita.estado) &&
        !cita.orden_trabajo_id;
    const { auth } = usePage<{ auth?: Auth }>().props;
    const currentUserId = auth?.user?.id ?? '';

    const { data, setData, post, put, processing, errors, clearErrors } = useForm<FormData>({
        sede_id: '',
        cliente_id: '',
        vehiculo_id: '',
        assigned_user_id: '',
        inicia_at: '',
        duracion_minutos: DURACION_DEFAULT,
        estado: 'programada',
        motivo: '',
        notas: '',
    });

    const defaultMecanicoId = useMemo(() => {
        if (!currentUserId) {
            return '';
        }

        return mecanicos.some((mecanico) => mecanico.id === currentUserId)
            ? currentUserId
            : '';
    }, [currentUserId, mecanicos]);

    const clienteOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            clientes.map((cliente) => ({
                value: cliente.id,
                label: cliente.nombre,
            })),
        [clientes],
    );

    const vehiculosFiltrados = useMemo(
        () => vehiculos.filter((vehiculo) => vehiculo.cliente_id === data.cliente_id),
        [vehiculos, data.cliente_id],
    );

    const vehiculoOptions = useMemo<readonly ComboboxOption[]>(
        () =>
            vehiculosFiltrados.map((vehiculo) => ({
                value: vehiculo.id,
                label: vehiculo.label,
            })),
        [vehiculosFiltrados],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();

        let iniciaDefault = nextHourLocal();
        if (!cita && prefill?.fecha) {
            const hora = prefill.hora && /^\d{2}:\d{2}$/.test(prefill.hora) ? prefill.hora : '09:00';
            iniciaDefault = `${prefill.fecha}T${hora}`;
        }

        setData({
            sede_id: cita?.sede_id ?? (sedes.length === 1 ? sedes[0].id : ''),
            cliente_id: cita?.cliente_id ?? '',
            vehiculo_id: cita?.vehiculo_id ?? '',
            assigned_user_id: cita?.assigned_user_id ?? defaultMecanicoId,
            inicia_at: cita ? toDatetimeLocal(cita.inicia_at) : iniciaDefault,
            duracion_minutos: String(cita?.duracion_minutos ?? Number(DURACION_DEFAULT)),
            estado: cita?.estado === 'convertida' ? 'programada' : (cita?.estado ?? 'programada'),
            motivo: cita?.motivo ?? '',
            notas: cita?.notas ?? '',
        });
    }, [open, cita, prefill, sedes, defaultMecanicoId, clearErrors, setData]);

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
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    {puedeAbrirOt && cita && onConvert ? (
                        <Button
                            type="button"
                            variant="secondary"
                            className="cursor-pointer gap-2"
                            disabled={processing}
                            onClick={() => {
                                onOpenChange(false);
                                onConvert(cita);
                            }}
                        >
                            <Wrench className="size-4" strokeWidth={2.25} />
                            Abrir OT
                        </Button>
                    ) : null}
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
                    <FormField
                        id="cita-sede"
                        label="Sede"
                        required
                        error={errors.sede_id}
                        className="min-w-0"
                    >
                        <Select
                            value={data.sede_id || undefined}
                            onValueChange={(value) => setData('sede_id', value)}
                            disabled={locked || processing}
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

                    <FormField
                        id="cita-cliente"
                        label="Cliente"
                        required
                        error={errors.cliente_id}
                        className="min-w-0"
                    >
                        <Combobox
                            id="cita-cliente"
                            options={clienteOptions}
                            value={data.cliente_id || null}
                            onChange={(value) => {
                                setData('cliente_id', value ?? '');
                                setData('vehiculo_id', '');
                            }}
                            placeholder="Buscar cliente…"
                            searchPlaceholder="Nombre del cliente…"
                            emptyMessage="Sin coincidencias."
                            clearable
                            disabled={locked || processing}
                            aria-invalid={Boolean(errors.cliente_id)}
                        />
                    </FormField>

                    <FormField
                        id="cita-vehiculo"
                        label="Vehículo"
                        required
                        error={errors.vehiculo_id}
                        className="min-w-0 sm:col-span-2"
                    >
                        <Combobox
                            id="cita-vehiculo"
                            options={vehiculoOptions}
                            value={data.vehiculo_id || null}
                            onChange={(value) => setData('vehiculo_id', value ?? '')}
                            placeholder={
                                data.cliente_id
                                    ? 'Buscar vehículo…'
                                    : 'Primero el cliente'
                            }
                            searchPlaceholder="Placa o modelo…"
                            emptyMessage={
                                data.cliente_id
                                    ? 'Este cliente no tiene vehículos.'
                                    : 'Selecciona un cliente primero.'
                            }
                            clearable
                            disabled={locked || processing || !data.cliente_id}
                            aria-invalid={Boolean(errors.vehiculo_id)}
                        />
                    </FormField>
                </FormSection>

                <FormSection index={1} title="Agenda" columns={2}>
                    <FormField
                        id="cita-inicio"
                        label="Fecha y hora"
                        required
                        error={errors.inicia_at}
                        className="min-w-0"
                    >
                        <Input
                            id="cita-inicio"
                            type="datetime-local"
                            value={data.inicia_at}
                            onChange={(e) => setData('inicia_at', e.target.value)}
                            disabled={locked || processing}
                        />
                    </FormField>

                    <FormField
                        id="cita-mec"
                        label="Mecánico"
                        error={errors.assigned_user_id}
                        className="min-w-0"
                    >
                        <Select
                            value={data.assigned_user_id || NONE}
                            onValueChange={(value) =>
                                setData('assigned_user_id', value === NONE ? '' : value)
                            }
                            disabled={locked || processing}
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

                    {isEdit && (
                        <FormField
                            id="cita-estado"
                            label="Estado"
                            error={errors.estado}
                            className="min-w-0 sm:col-span-2"
                        >
                            <Select
                                value={data.estado}
                                onValueChange={(value) => setData('estado', value as CitaEstado)}
                                disabled={locked || processing}
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

                    <FormField
                        id="cita-motivo"
                        label="Motivo"
                        error={errors.motivo}
                        className="min-w-0 sm:col-span-2"
                    >
                        <Input
                            id="cita-motivo"
                            value={data.motivo}
                            onChange={(e) => setData('motivo', e.target.value)}
                            placeholder="Cambio de aceite, frenos…"
                            disabled={locked || processing}
                        />
                    </FormField>

                    <FormField
                        id="cita-notas"
                        label="Notas"
                        error={errors.notas}
                        className="min-w-0 sm:col-span-2"
                    >
                        <Textarea
                            id="cita-notas"
                            value={data.notas}
                            onChange={(e) => setData('notas', e.target.value)}
                            rows={2}
                            disabled={locked || processing}
                        />
                    </FormField>
                </FormSection>
            </div>
        </FormModal>
    );
}
