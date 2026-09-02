import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
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
};

export function TenantFormModal({
    open,
    onOpenChange,
    tenant,
    plans,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant: PlataformaTenant | null;
    plans: readonly PlanCatalogItem[];
}) {
    const isEdit = tenant !== null;

    const createForm = useForm<CreateForm>({
        tenant_slug: '',
        razon_social: '',
        nombre_comercial: '',
        ruc: '',
        admin_email: '',
        admin_password: '',
        telefono: '',
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
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        if (tenant) {
            editForm.clearErrors();
            editForm.setData({
                razon_social: tenant.razon_social,
                nombre_comercial: tenant.nombre_comercial ?? '',
                ruc: tenant.ruc ?? '',
                email_admin: tenant.email_admin,
                telefono: tenant.telefono ?? '',
                direccion: tenant.direccion ?? '',
            });
        } else {
            createForm.clearErrors();
            createForm.reset();
            createForm.setData('plan_slug', plans[0]?.codigo ?? '');
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
    const errors = isEdit ? editForm.errors : createForm.errors;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar taller' : 'Nuevo taller'}
            description={
                isEdit
                    ? `Subdominio ${tenant?.slug}`
                    : 'Crea el schema, el admin y la suscripción inicial.'
            }
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? 'Guardar cambios' : 'Crear taller'}
                    </Button>
                </>
            }
        >
            {isEdit ? (
                <FormSection index={0} title="Identidad" columns={2}>
                    <FormField
                        id="t-razon"
                        label="Razón social"
                        required
                        error={errors.razon_social}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="t-razon"
                            value={editForm.data.razon_social}
                            onChange={(e) =>
                                editForm.setData('razon_social', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        id="t-comercial"
                        label="Nombre comercial"
                        error={errors.nombre_comercial}
                    >
                        <Input
                            id="t-comercial"
                            value={editForm.data.nombre_comercial}
                            onChange={(e) =>
                                editForm.setData('nombre_comercial', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField id="t-ruc" label="RUC" error={errors.ruc}>
                        <Input
                            id="t-ruc"
                            value={editForm.data.ruc}
                            onChange={(e) => editForm.setData('ruc', e.target.value)}
                        />
                    </FormField>
                    <FormField
                        id="t-email"
                        label="Correo admin"
                        required
                        error={errors.email_admin}
                    >
                        <Input
                            id="t-email"
                            type="email"
                            value={editForm.data.email_admin}
                            onChange={(e) =>
                                editForm.setData('email_admin', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField id="t-tel" label="Teléfono" error={errors.telefono}>
                        <Input
                            id="t-tel"
                            value={editForm.data.telefono}
                            onChange={(e) => editForm.setData('telefono', e.target.value)}
                        />
                    </FormField>
                    <FormField
                        id="t-dir"
                        label="Dirección"
                        error={errors.direccion}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="t-dir"
                            value={editForm.data.direccion}
                            onChange={(e) => editForm.setData('direccion', e.target.value)}
                        />
                    </FormField>
                </FormSection>
            ) : (
                <FormSection index={0} title="Alta" columns={2}>
                    <FormField
                        id="t-slug"
                        label="Subdominio"
                        required
                        error={createForm.errors.tenant_slug}
                        hint="Solo minúsculas, números y guiones."
                    >
                        <Input
                            id="t-slug"
                            value={createForm.data.tenant_slug}
                            onChange={(e) =>
                                createForm.setData('tenant_slug', e.target.value)
                            }
                            placeholder="taller-norte"
                        />
                    </FormField>
                    <FormField
                        id="t-plan"
                        label="Plan"
                        required
                        error={createForm.errors.plan_slug}
                    >
                        <Select
                            value={createForm.data.plan_slug}
                            onValueChange={(value) =>
                                createForm.setData('plan_slug', value)
                            }
                        >
                            <SelectTrigger id="t-plan">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.codigo}>
                                        {plan.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField
                        id="c-razon"
                        label="Razón social"
                        required
                        error={createForm.errors.razon_social}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="c-razon"
                            value={createForm.data.razon_social}
                            onChange={(e) =>
                                createForm.setData('razon_social', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        id="c-email"
                        label="Correo del admin"
                        required
                        error={createForm.errors.admin_email}
                    >
                        <Input
                            id="c-email"
                            type="email"
                            value={createForm.data.admin_email}
                            onChange={(e) =>
                                createForm.setData('admin_email', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        id="c-pass"
                        label="Contraseña"
                        required
                        error={createForm.errors.admin_password}
                    >
                        <Input
                            id="c-pass"
                            type="password"
                            value={createForm.data.admin_password}
                            onChange={(e) =>
                                createForm.setData('admin_password', e.target.value)
                            }
                        />
                    </FormField>
                </FormSection>
            )}
        </FormModal>
    );
}
