import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';

type SedeOption = { id: string; nombre: string; codigo: string };
type ClienteHit = { id: string; nombre: string; documento: string };
type VehiculoHit = { id: string; cliente_id: string; placa: string };

type FormState = {
    sede_id: string;
    cliente_id: string;
    vehiculo_id: string;
    placa: string;
    notas: string;
};

const controlClass = 'h-9 w-full';

function emptyForm(sedes: readonly SedeOption[]): FormState {
    return {
        sede_id: sedes.length === 1 ? sedes[0].id : '',
        cliente_id: '',
        vehiculo_id: '',
        placa: '',
        notas: '',
    };
}

export function LavadoFormModal({
    open,
    onOpenChange,
    sedes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sedes: readonly SedeOption[];
}) {
    const form = useForm<FormState>(emptyForm(sedes));
    const [clienteQuery, setClienteQuery] = useState('');
    const [vehiculoQuery, setVehiculoQuery] = useState('');
    const [clientes, setClientes] = useState<ClienteHit[]>([]);
    const [vehiculos, setVehiculos] = useState<VehiculoHit[]>([]);
    const [loading, setLoading] = useState(false);

    const resetFields = () => {
        form.reset();
        form.clearErrors();
        form.setData(emptyForm(sedes));
        setClienteQuery('');
        setVehiculoQuery('');
        setClientes([]);
        setVehiculos([]);
    };

    const { remember, requestClose } = useUnsavedFormGuard(form.data, (next) => {
        if (!next) {
            resetFields();
        }

        onOpenChange(next);
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const initial = emptyForm(sedes);
        remember(initial);
        form.setData(initial);
        // La foto se toma al abrir. `sedes` no va en deps para no rebasar mientras se escribe.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, remember]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();
        const handle = window.setTimeout(() => {
            const params = new URLSearchParams();
            const q = clienteQuery.trim();
            const placa = vehiculoQuery.trim();

            if (q !== '') {
                params.set('q', q);
            }
            if (form.data.cliente_id !== '') {
                params.set('cliente_id', form.data.cliente_id);
                params.set('seleccion', form.data.cliente_id);
            }
            if (placa !== '') {
                params.set('vehiculo_q', placa);
            }

            setLoading(true);

            fetch(`/taller/lavados/opciones?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                signal: controller.signal,
            })
                .then(async (response) => {
                    if (!response.ok) {
                        return;
                    }

                    const payload = (await response.json()) as {
                        clientes: ClienteHit[];
                        vehiculos: VehiculoHit[];
                    };
                    setClientes(payload.clientes ?? []);
                    setVehiculos(payload.vehiculos ?? []);
                })
                .catch(() => {
                    /* abort o red */
                })
                .finally(() => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                    }
                });
        }, 250);

        return () => {
            window.clearTimeout(handle);
            controller.abort();
        };
    }, [open, clienteQuery, vehiculoQuery, form.data.cliente_id]);

    const sedeOptions = useMemo<ComboboxOption[]>(
        () => sedes.map((sede) => ({ value: sede.id, label: `${sede.nombre} (${sede.codigo})` })),
        [sedes],
    );
    const clienteOptions = useMemo<ComboboxOption[]>(
        () =>
            clientes.map((cliente) => ({
                value: cliente.id,
                label: cliente.nombre,
                keywords: cliente.documento,
            })),
        [clientes],
    );
    const vehiculoOptions = useMemo<ComboboxOption[]>(
        () => vehiculos.map((vehiculo) => ({ value: vehiculo.id, label: vehiculo.placa })),
        [vehiculos],
    );

    const canCreate =
        !form.processing &&
        form.data.sede_id.trim() !== '' &&
        form.data.cliente_id.trim() !== '' &&
        form.data.placa.trim() !== '';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!canCreate) {
            return;
        }

        form.post('/taller/lavados', {
            preserveScroll: true,
            onSuccess: () => {
                resetFields();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={requestClose}
            title="Nuevo lavado"
            description="Cliente y placa. Los cargos se agregan en la precuenta."
            onSubmit={submit}
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => requestClose(false)}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={!canCreate}>
                        Crear lavado
                    </Button>
                </>
            }
        >
            <FormSection
                title="Recepción"
                description="La búsqueda de cliente recorre todo el taller, no solo los primeros de la lista."
                columns={2}
            >
                <FormField id="lavado-sede" label="Sede" required error={form.errors.sede_id} className="min-w-0">
                    <Combobox
                        id="lavado-sede"
                        className={controlClass}
                        options={sedeOptions}
                        value={form.data.sede_id || null}
                        onChange={(value) => form.setData('sede_id', value ?? '')}
                        placeholder="Selecciona sede"
                        searchPlaceholder="Buscar sede…"
                        emptyMessage="Sin sedes."
                        aria-invalid={Boolean(form.errors.sede_id)}
                    />
                </FormField>
                <FormField
                    id="lavado-cliente"
                    label="Cliente"
                    required
                    error={form.errors.cliente_id}
                    className="min-w-0"
                >
                    <Combobox
                        id="lavado-cliente"
                        className={controlClass}
                        options={clienteOptions}
                        value={form.data.cliente_id || null}
                        onChange={(value) => {
                            form.setData((current) => ({
                                ...current,
                                cliente_id: value ?? '',
                                vehiculo_id: '',
                                placa: '',
                            }));
                            setVehiculoQuery('');
                        }}
                        onSearchChange={setClienteQuery}
                        loading={loading}
                        placeholder="Buscar cliente…"
                        searchPlaceholder="Nombre, documento o teléfono…"
                        emptyMessage="Sin coincidencias. Prueba con el documento."
                        aria-invalid={Boolean(form.errors.cliente_id)}
                    />
                </FormField>
                <FormField
                    id="lavado-vehiculo"
                    label="Vehículo"
                    error={form.errors.vehiculo_id}
                    className="min-w-0"
                >
                    <Combobox
                        id="lavado-vehiculo"
                        className={controlClass}
                        options={vehiculoOptions}
                        value={form.data.vehiculo_id || null}
                        onChange={(value) => {
                            const vehiculo = vehiculos.find((item) => item.id === value);
                            form.setData((current) => ({
                                ...current,
                                vehiculo_id: value ?? '',
                                placa: vehiculo?.placa ?? current.placa,
                            }));
                        }}
                        onSearchChange={setVehiculoQuery}
                        placeholder={form.data.cliente_id ? 'Opcional' : 'Primero el cliente'}
                        searchPlaceholder="Placa…"
                        emptyMessage={
                            form.data.cliente_id ? 'Este cliente no tiene vehículos.' : 'Selecciona un cliente.'
                        }
                        disabled={!form.data.cliente_id}
                        aria-invalid={Boolean(form.errors.vehiculo_id)}
                    />
                </FormField>
                <FormField id="lavado-placa" label="Placa" required error={form.errors.placa} className="min-w-0">
                    <Input
                        id="lavado-placa"
                        className={controlClass}
                        value={form.data.placa}
                        onChange={(event) => form.setData('placa', event.target.value.toUpperCase())}
                        placeholder="ABC-123"
                        aria-invalid={Boolean(form.errors.placa)}
                    />
                </FormField>
                <FormField id="lavado-notas" label="Notas" error={form.errors.notas} className="min-w-0 sm:col-span-2">
                    <Textarea
                        id="lavado-notas"
                        className="w-full"
                        value={form.data.notas}
                        onChange={(event) => form.setData('notas', event.target.value)}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}
