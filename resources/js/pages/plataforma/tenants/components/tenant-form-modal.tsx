import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { GeoCascadeFields, type GeoCascadeValue, type GeoOption } from '@/components/geo/geo-cascade-fields';
import { planColor } from '@/components/tenant-plan-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUnsavedFormGuard } from '@/hooks/use-unsaved-form-guard';
import { tenantHost, useTenancy } from '@/lib/tenancy-url';
import tenants from '@/routes/plataforma/tenants';
import type { PlanCatalogItem, PlataformaTenant } from '../types';

type CreateForm = {
    tenant_slug: string;
    razon_social: string;
    nombre_comercial: string;
    ruc: string;
    admin_email: string;
    admin_password: string;
    telefono: string;
    direccion: string;
    distrito_id: number | null;
    timezone: string;
    locale: string;
    plan_slug: string;
    ciclo: string;
};

type EditForm = {
    razon_social: string;
    nombre_comercial: string;
    ruc: string;
    email_admin: string;
    telefono: string;
    direccion: string;
    distrito_id: number | null;
    timezone: string;
    locale: string;
};

const emptyGeo = (): GeoCascadeValue => ({
    departamento_id: null,
    provincia_id: null,
    distrito_id: null,
});

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
}

function geoFromTenant(tenant: PlataformaTenant | null): GeoCascadeValue {
    const sede = tenant?.sedes?.[0];
    const model = sede?.distrito_model;

    if (!model?.provincia) {
        return { ...emptyGeo(), distrito_id: sede?.distrito_id ?? null };
    }

    return {
        departamento_id: model.provincia.departamento_id,
        provincia_id: model.provincia.id,
        distrito_id: model.id,
    };
}

export function TenantFormModal({
    open,
    onOpenChange,
    tenant,
    plans,
    departamentos,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant: PlataformaTenant | null;
    plans: readonly PlanCatalogItem[];
    departamentos: readonly GeoOption[];
}) {
    const isEdit = tenant !== null;
    const tenancy = useTenancy();
    const [geo, setGeo] = useState<GeoCascadeValue>(emptyGeo());

    const createForm = useForm<CreateForm>({
        tenant_slug: '',
        razon_social: '',
        nombre_comercial: '',
        ruc: '',
        admin_email: '',
        admin_password: '',
        telefono: '',
        direccion: '',
        distrito_id: null,
        timezone: 'America/Lima',
        locale: 'es_PE',
        plan_slug: plans[0]?.codigo ?? '',
        ciclo: 'mensual',
    });

    const editForm = useForm<EditForm>({
        razon_social: '',
        nombre_comercial: '',
        ruc: '',
        email_admin: '',
        telefono: '',
        direccion: '',
        distrito_id: null,
        timezone: 'America/Lima',
        locale: 'es_PE',
    });
    const { remember, requestClose } = useUnsavedFormGuard(
        isEdit ? editForm.data : createForm.data,
        onOpenChange,
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        const location = geoFromTenant(tenant);
        setGeo(location);

        if (tenant) {
            editForm.clearErrors();
            const initial: EditForm = {
                razon_social: tenant.razon_social,
                nombre_comercial: tenant.nombre_comercial ?? '',
                ruc: tenant.ruc ?? '',
                email_admin: tenant.email_admin,
                telefono: tenant.telefono ?? '',
                direccion: tenant.direccion ?? tenant.sedes?.[0]?.direccion ?? '',
                distrito_id: location.distrito_id,
                timezone: tenant.timezone ?? 'America/Lima',
                locale: tenant.locale ?? 'es_PE',
            };
            remember(initial);
            editForm.setData(initial);
        } else {
            createForm.clearErrors();
            const initial: CreateForm = {
                tenant_slug: '',
                razon_social: '',
                nombre_comercial: '',
                ruc: '',
                admin_email: '',
                admin_password: '',
                telefono: '',
                direccion: '',
                distrito_id: null,
                timezone: 'America/Lima',
                locale: 'es_PE',
                plan_slug: plans[0]?.codigo ?? '',
                ciclo: 'mensual',
            };
            remember(initial);
            createForm.reset();
            createForm.setData(initial);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tenant]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (isEdit && tenant) {
            editForm.put(tenants.update(tenant.id).url, {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
            });

            return;
        }

        createForm.post(tenants.store().url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const processing = isEdit ? editForm.processing : createForm.processing;
    const slug = createForm.data.tenant_slug.replace(/-+$/g, '');
    const hostPreview = slug ? tenantHost(slug, tenancy) : `slug.${tenancy.root_domain}`;

    const onGeo = (next: GeoCascadeValue) => {
        setGeo(next);
        if (isEdit) {
            editForm.setData('distrito_id', next.distrito_id);
        } else {
            createForm.setData('distrito_id', next.distrito_id);
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={requestClose}
            title={isEdit ? 'Editar taller' : 'Nuevo taller'}
            description={
                isEdit
                    ? `Subdominio ${tenantHost(tenant?.slug ?? '', tenancy)}`
                    : `Se crea el subdominio {slug}.${tenancy.root_domain} y la sede principal del taller.`
            }
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button type="button" variant="outline" className="cursor-pointer" onClick={() => requestClose(false)}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar cambios' : 'Crear taller'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                {isEdit ? (
                    <IdentityFields
                        razon={editForm.data.razon_social}
                        comercial={editForm.data.nombre_comercial}
                        ruc={editForm.data.ruc}
                        errors={editForm.errors}
                        onRazon={(value) => editForm.setData('razon_social', value)}
                        onComercial={(value) => editForm.setData('nombre_comercial', value)}
                        onRuc={(value) => editForm.setData('ruc', value.replace(/\D/g, '').slice(0, 11))}
                    />
                ) : (
                    <>
                        <FormSection
                            index={0}
                            title="Identidad"
                            description={`El slug es el subdominio. Quedará amarrado como ${hostPreview}.`}
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    id="t-slug"
                                    label="Slug (subdominio)"
                                    required
                                    error={createForm.errors.tenant_slug}
                                    hint={`Solo minúsculas, números y guiones. Será ${hostPreview}.`}
                                >
                                    <Input
                                        id="t-slug"
                                        value={createForm.data.tenant_slug}
                                        autoComplete="off"
                                        className="font-mono"
                                        placeholder="taller-norte"
                                        onChange={(event) => createForm.setData('tenant_slug', slugify(event.target.value))}
                                    />
                                </FormField>
                                <FormField id="t-plan" label="Plan" required error={createForm.errors.plan_slug}>
                                    <Select
                                        value={createForm.data.plan_slug}
                                        onValueChange={(value) => createForm.setData('plan_slug', value)}
                                    >
                                        <SelectTrigger id="t-plan" className="h-9 w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plans.map((plan) => (
                                                <SelectItem key={plan.id} value={plan.codigo}>
                                                    <span className="inline-flex items-center gap-2">
                                                        <span
                                                            className="size-2.5 rounded-full"
                                                            style={{ backgroundColor: planColor(plan.codigo, plan.color_hex) }}
                                                        />
                                                        {plan.nombre}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <IdentityInputs
                                    razon={createForm.data.razon_social}
                                    comercial={createForm.data.nombre_comercial}
                                    ruc={createForm.data.ruc}
                                    errors={createForm.errors}
                                    onRazon={(value) => createForm.setData('razon_social', value)}
                                    onComercial={(value) => createForm.setData('nombre_comercial', value)}
                                    onRuc={(value) => createForm.setData('ruc', value.replace(/\D/g, '').slice(0, 11))}
                                />
                            </div>
                        </FormSection>
                    </>
                )}

                <FormSection index={1} title="Contacto y ubicación" description="Correo del administrador, teléfono y sede principal.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {isEdit ? (
                            <FormField id="t-email" label="Email del administrador" required error={editForm.errors.email_admin}>
                                <Input
                                    id="t-email"
                                    type="email"
                                    value={editForm.data.email_admin}
                                    onChange={(event) => editForm.setData('email_admin', event.target.value)}
                                />
                            </FormField>
                        ) : (
                            <>
                                <FormField
                                    id="c-email"
                                    label="Email del administrador"
                                    required
                                    hint="Recibe el acceso inicial y queda como admin del taller."
                                    error={createForm.errors.admin_email}
                                >
                                    <Input
                                        id="c-email"
                                        type="email"
                                        placeholder="admin@taller.com"
                                        value={createForm.data.admin_email}
                                        onChange={(event) => createForm.setData('admin_email', event.target.value)}
                                    />
                                </FormField>
                                <FormField id="c-pass" label="Contraseña" required error={createForm.errors.admin_password}>
                                    <Input
                                        id="c-pass"
                                        type="password"
                                        value={createForm.data.admin_password}
                                        onChange={(event) => createForm.setData('admin_password', event.target.value)}
                                    />
                                </FormField>
                            </>
                        )}
                        <FormField
                            id="t-tel"
                            label="Teléfono"
                            error={isEdit ? editForm.errors.telefono : createForm.errors.telefono}
                        >
                            <Input
                                id="t-tel"
                                placeholder="+51 999 999 999"
                                value={isEdit ? editForm.data.telefono : createForm.data.telefono}
                                onChange={(event) =>
                                    isEdit
                                        ? editForm.setData('telefono', event.target.value)
                                        : createForm.setData('telefono', event.target.value)
                                }
                            />
                        </FormField>
                        {!isEdit ? (
                            <FormField id="t-ciclo" label="Ciclo" error={createForm.errors.ciclo}>
                                <Select value={createForm.data.ciclo} onValueChange={(value) => createForm.setData('ciclo', value)}>
                                    <SelectTrigger id="t-ciclo" className="h-9 w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mensual">Mensual</SelectItem>
                                        <SelectItem value="anual">Anual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                        ) : null}
                        <FormField
                            id="t-dir"
                            label="Dirección"
                            error={isEdit ? editForm.errors.direccion : createForm.errors.direccion}
                            className="sm:col-span-2"
                        >
                            <Input
                                id="t-dir"
                                placeholder="Av. Las Palmeras 123"
                                value={isEdit ? editForm.data.direccion : createForm.data.direccion}
                                onChange={(event) =>
                                    isEdit
                                        ? editForm.setData('direccion', event.target.value)
                                        : createForm.setData('direccion', event.target.value)
                                }
                            />
                        </FormField>
                        <div className="sm:col-span-2">
                            <GeoCascadeFields
                                departamentos={departamentos}
                                value={geo}
                                onChange={onGeo}
                                errors={{
                                    distrito_id: isEdit ? editForm.errors.distrito_id : createForm.errors.distrito_id,
                                }}
                            />
                        </div>
                    </div>
                </FormSection>

                <FormSection index={2} title="Configuración" description="Zona horaria e idioma del taller.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                            id="t-tz"
                            label="Zona horaria"
                            hint="Formato IANA. America/Lima por defecto."
                            error={isEdit ? editForm.errors.timezone : createForm.errors.timezone}
                        >
                            <Input
                                id="t-tz"
                                className="font-mono"
                                value={isEdit ? editForm.data.timezone : createForm.data.timezone}
                                onChange={(event) =>
                                    isEdit
                                        ? editForm.setData('timezone', event.target.value)
                                        : createForm.setData('timezone', event.target.value)
                                }
                            />
                        </FormField>
                        <FormField
                            id="t-locale"
                            label="Idioma"
                            hint="Formato es_PE."
                            error={isEdit ? editForm.errors.locale : createForm.errors.locale}
                        >
                            <Input
                                id="t-locale"
                                className="font-mono"
                                value={isEdit ? editForm.data.locale : createForm.data.locale}
                                onChange={(event) =>
                                    isEdit
                                        ? editForm.setData('locale', event.target.value)
                                        : createForm.setData('locale', event.target.value)
                                }
                            />
                        </FormField>
                    </div>
                </FormSection>
            </div>
        </FormModal>
    );
}

function IdentityFields({
    razon,
    comercial,
    ruc,
    errors,
    onRazon,
    onComercial,
    onRuc,
}: {
    razon: string;
    comercial: string;
    ruc: string;
    errors: Partial<Record<string, string>>;
    onRazon: (value: string) => void;
    onComercial: (value: string) => void;
    onRuc: (value: string) => void;
}) {
    return (
        <FormSection index={0} title="Identidad" description="Datos legales del taller.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <IdentityInputs
                    razon={razon}
                    comercial={comercial}
                    ruc={ruc}
                    errors={errors}
                    onRazon={onRazon}
                    onComercial={onComercial}
                    onRuc={onRuc}
                />
            </div>
        </FormSection>
    );
}

function IdentityInputs({
    razon,
    comercial,
    ruc,
    errors,
    onRazon,
    onComercial,
    onRuc,
}: {
    razon: string;
    comercial: string;
    ruc: string;
    errors: Partial<Record<string, string>>;
    onRazon: (value: string) => void;
    onComercial: (value: string) => void;
    onRuc: (value: string) => void;
}) {
    return (
        <>
            <FormField id="t-razon" label="Razón social" required error={errors.razon_social} className="sm:col-span-2">
                <Input id="t-razon" value={razon} onChange={(event) => onRazon(event.target.value)} />
            </FormField>
            <FormField id="t-comercial" label="Nombre comercial" error={errors.nombre_comercial}>
                <Input id="t-comercial" value={comercial} onChange={(event) => onComercial(event.target.value)} />
            </FormField>
            <FormField id="t-ruc" label="RUC" hint="11 dígitos numéricos." error={errors.ruc}>
                <Input id="t-ruc" inputMode="numeric" maxLength={11} value={ruc} onChange={(event) => onRuc(event.target.value)} />
            </FormField>
        </>
    );
}
