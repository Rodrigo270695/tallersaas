import { router } from '@inertiajs/react';
import { ClipboardCheck, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { FormField, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const NONE = '__ninguno__';

type CatalogoItem = { clave: string; label: string };
type Persona = { id: string; name: string };
type PuestoOption = { id: string; nombre: string };
type ChecklistEstado = 'ok' | 'observacion' | 'na';

type Props = {
    ordenId: string;
    puestoId: string | null;
    puestos: readonly PuestoOption[];
    personas: readonly Persona[];
    responsableId: string;
    apoyoId: string;
    checklistGuardado: readonly { clave: string; estado: ChecklistEstado; nota: string | null }[];
    catalogo: readonly CatalogoItem[];
    kilometrajes: readonly { id: string; km: number; origen: string }[];
    canEquipo: boolean;
    canChecklist: boolean;
};

export function OrdenEquipoPanel({
    ordenId,
    puestoId,
    puestos,
    personas,
    responsableId,
    apoyoId,
    checklistGuardado,
    catalogo,
    kilometrajes,
    canEquipo,
    canChecklist,
}: Props) {
    const [puesto, setPuesto] = useState(puestoId ?? '');
    const [responsable, setResponsable] = useState(responsableId);
    const [apoyo, setApoyo] = useState(apoyoId);
    const [checklist, setChecklist] = useState(() =>
        catalogo.map((item) => {
            const guardado = checklistGuardado.find((fila) => fila.clave === item.clave);
            return {
                clave: item.clave,
                label: item.label,
                estado: (guardado?.estado ?? 'na') as ChecklistEstado,
                nota: guardado?.nota ?? '',
            };
        }),
    );
    const [saving, setSaving] = useState(false);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const mecanicos: { user_id: string; rol: 'responsable' | 'apoyo' }[] = [];
        if (responsable) {
            mecanicos.push({ user_id: responsable, rol: 'responsable' });
        }
        if (apoyo && apoyo !== responsable) {
            mecanicos.push({ user_id: apoyo, rol: 'apoyo' });
        }

        setSaving(true);
        router.post(
            `/taller/ordenes-trabajo/${ordenId}/equipo`,
            {
                puesto_id: puesto || null,
                mecanicos,
                checklist: checklist.map((item) => ({
                    clave: item.clave,
                    estado: item.estado,
                    nota: item.nota.trim() === '' ? null : item.nota.trim(),
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="size-4 text-brand-600" />
                        Equipo y puesto
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                    <OpcionSelect
                        id="ot-puesto"
                        label="Puesto"
                        value={puesto}
                        disabled={!canEquipo}
                        emptyLabel="Sin puesto"
                        options={puestos.map((puestoOption) => ({
                            id: puestoOption.id,
                            label: puestoOption.nombre,
                        }))}
                        onChange={setPuesto}
                    />
                    <OpcionSelect
                        id="ot-responsable"
                        label="Responsable"
                        value={responsable}
                        disabled={!canEquipo}
                        emptyLabel="Sin asignar"
                        options={personas.map((persona) => ({ id: persona.id, label: persona.name }))}
                        onChange={setResponsable}
                    />
                    <OpcionSelect
                        id="ot-apoyo"
                        label="Apoyo"
                        value={apoyo}
                        disabled={!canEquipo}
                        emptyLabel="Sin asignar"
                        options={personas.map((persona) => ({ id: persona.id, label: persona.name }))}
                        onChange={setApoyo}
                    />
                </CardContent>
            </Card>

            <FormSection index={0} title="Inspección de ingreso" icon={ClipboardCheck} columns={1}>
                {checklist.map((item, index) => (
                    <div key={item.clave} className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr] sm:items-center">
                        <span className="text-sm font-medium">{item.label}</span>
                        <Select
                            value={item.estado}
                            disabled={!canChecklist}
                            onValueChange={(value) => {
                                const next = [...checklist];
                                next[index] = { ...item, estado: value as ChecklistEstado };
                                setChecklist(next);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ok">Bien</SelectItem>
                                <SelectItem value="observacion">Observación</SelectItem>
                                <SelectItem value="na">No aplica</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            value={item.nota}
                            placeholder="Nota"
                            disabled={!canChecklist}
                            onChange={(event) => {
                                const next = [...checklist];
                                next[index] = { ...item, nota: event.target.value };
                                setChecklist(next);
                            }}
                        />
                    </div>
                ))}
            </FormSection>

            {kilometrajes.length > 0 ? (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Kilometraje</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                        {kilometrajes.map((fila) => (
                            <p key={fila.id} className="flex justify-between gap-3">
                                <span className="text-muted-foreground capitalize">{fila.origen}</span>
                                <span className="tabular-nums">{fila.km.toLocaleString('es-PE')} km</span>
                            </p>
                        ))}
                    </CardContent>
                </Card>
            ) : null}

            {canEquipo || canChecklist ? (
                <Button type="submit" className="min-h-11 cursor-pointer self-start" disabled={saving}>
                    Guardar equipo e inspección
                </Button>
            ) : null}
        </form>
    );
}

function OpcionSelect({
    id,
    label,
    value,
    options,
    emptyLabel,
    disabled,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    options: readonly { id: string; label: string }[];
    emptyLabel: string;
    disabled: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <FormField id={id} label={label}>
            <Select
                value={value || NONE}
                onValueChange={(next) => onChange(next === NONE ? '' : next)}
                disabled={disabled}
            >
                <SelectTrigger id={id}>
                    <SelectValue placeholder={emptyLabel} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>{emptyLabel}</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
    );
}
