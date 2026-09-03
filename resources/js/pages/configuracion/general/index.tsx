import { Head, useForm } from '@inertiajs/react';
import {
    Bell,
    Building2,
    CheckCircle2,
    Info,
    Loader2,
    Palette,
    Phone,
    Receipt,
    Save,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader, StatBadge } from '@/components/data-page';
import {
    GeoCascadeFields,
    type GeoCascadeValue,
    type GeoOption,
} from '@/components/geo/geo-cascade-fields';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/hooks/use-permission';
import general from '@/routes/configuracion/general';
import { LogoUploader } from './components/logo-uploader';
import { SectionCard } from './components/section-card';

type DistritoChain = {
    id: number;
    name: string;
    provincia_id: number;
    provincia: {
        id: number;
        name: string;
        departamento_id: number;
        departamento: {
            id: number;
            name: string;
        } | null;
    } | null;
} | null;

export type TallerSettingPayload = {
    id: string;
    ruc: string | null;
    razon_social: string | null;
    nombre_comercial: string | null;
    direccion_fiscal: string | null;
    distrito_id: number | null;
    distrito_model: DistritoChain;
    logo_url: string | null;
    color_primario: string | null;
    color_secundario: string | null;
    email_institucional: string | null;
    telefono_principal: string | null;
    web_url: string | null;
    moneda: string;
    igv_porcentaje: number;
    igv_afectacion: 'gravado' | 'exonerado' | 'inafecto';
    precio_incluye_igv: boolean;
    ticket_ancho_mm: number;
    emite_comprobantes_sunat: boolean;
    apisunat_configurado: boolean;
    apisunat_mode: 'sandbox' | 'produccion';
    notificar_cita_whatsapp_activo: boolean;
    recordatorio_48h_activo: boolean;
    recordatorio_2h_activo: boolean;
    updated_at: string | null;
    actualizado_por: {
        id: string;
        name: string;
        email: string;
    } | null;
};

type GeneralIndexProps = {
    setting: TallerSettingPayload;
    departamentos: readonly GeoOption[];
};

type GeneralTab = 'taller' | 'notificaciones' | 'facturacion';

type FormData = {
    ruc: string;
    razon_social: string;
    nombre_comercial: string;
    direccion_fiscal: string;
    distrito_id: number | null;
    color_primario: string;
    color_secundario: string;
    email_institucional: string;
    telefono_principal: string;
    web_url: string;
    moneda: string;
    igv_porcentaje: string;
    igv_afectacion: string;
    precio_incluye_igv: boolean;
    ticket_ancho_mm: string;
    emite_comprobantes_sunat: boolean;
    apisunat_token: string;
    clear_apisunat_token: boolean;
    apisunat_mode: string;
    notificar_cita_whatsapp_activo: boolean;
    recordatorio_48h_activo: boolean;
    recordatorio_2h_activo: boolean;
    logo: File | null;
    clear_logo: boolean;
    _method: 'put';
};

const buildGeo = (setting: TallerSettingPayload): GeoCascadeValue => {
    const chain = setting.distrito_model;

    if (!chain?.provincia) {
        return {
            departamento_id: null,
            provincia_id: null,
            distrito_id: setting.distrito_id,
        };
    }

    return {
        departamento_id: chain.provincia.departamento_id,
        provincia_id: chain.provincia_id,
        distrito_id: chain.id,
    };
};

const resolveErrorTab = (errs: Partial<Record<string, string>>): GeneralTab => {
    const keys = Object.keys(errs);

    if (
        keys.some((key) =>
            [
                'moneda',
                'igv_porcentaje',
                'igv_afectacion',
                'precio_incluye_igv',
                'ticket_ancho_mm',
                'emite_comprobantes_sunat',
                'apisunat_token',
                'apisunat_mode',
                'clear_apisunat_token',
            ].includes(key),
        )
    ) {
        return 'facturacion';
    }

    if (
        keys.some((key) =>
            [
                'notificar_cita_whatsapp_activo',
                'recordatorio_48h_activo',
                'recordatorio_2h_activo',
            ].includes(key),
        )
    ) {
        return 'notificaciones';
    }

    return 'taller';
};

type ToggleRowProps = {
    id: string;
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    className?: string;
};

function ToggleRow({
    id,
    label,
    hint,
    checked,
    onChange,
    disabled,
    className,
}: ToggleRowProps) {
    return (
        <label
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60 ${className ?? ''}`}
        >
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => onChange(value === true)}
                disabled={disabled}
                className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{label}</span>
                {hint ? (
                    <span className="text-xs text-muted-foreground">{hint}</span>
                ) : null}
            </div>
        </label>
    );
}

export default function Index({ setting, departamentos }: GeneralIndexProps) {
    const { can } = usePermission();
    const canUpdate = can('config-general.update');

    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm<FormData>({
            ruc: setting.ruc ?? '',
            razon_social: setting.razon_social ?? '',
            nombre_comercial: setting.nombre_comercial ?? '',
            direccion_fiscal: setting.direccion_fiscal ?? '',
            distrito_id: setting.distrito_id,
            color_primario: setting.color_primario ?? '',
            color_secundario: setting.color_secundario ?? '',
            email_institucional: setting.email_institucional ?? '',
            telefono_principal: setting.telefono_principal ?? '',
            web_url: setting.web_url ?? '',
            moneda: setting.moneda || 'PEN',
            igv_porcentaje: String(setting.igv_porcentaje ?? 18),
            igv_afectacion: setting.igv_afectacion || 'gravado',
            precio_incluye_igv: setting.precio_incluye_igv,
            ticket_ancho_mm: String(setting.ticket_ancho_mm ?? 80),
            emite_comprobantes_sunat: setting.emite_comprobantes_sunat ?? false,
            apisunat_token: '',
            clear_apisunat_token: false,
            apisunat_mode: setting.apisunat_mode || 'sandbox',
            notificar_cita_whatsapp_activo:
                setting.notificar_cita_whatsapp_activo ?? true,
            recordatorio_48h_activo: setting.recordatorio_48h_activo ?? true,
            recordatorio_2h_activo: setting.recordatorio_2h_activo ?? true,
            logo: null,
            clear_logo: false,
            _method: 'put',
        });

    const [activeTab, setActiveTab] = useState<GeneralTab>('taller');
    const [geo, setGeo] = useState<GeoCascadeValue>(() => buildGeo(setting));

    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            setActiveTab(resolveErrorTab(errors));
        }
    }, [errors]);

    const handleGeoChange = (next: GeoCascadeValue) => {
        setGeo(next);
        setData('distrito_id', next.distrito_id);
    };

    const fieldClass = 'flex min-w-0 flex-col gap-1.5';

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canUpdate) {
            return;
        }

        post(general.update().url, {
            forceFormData: true,
            preserveScroll: true,
            onError: (errs) => {
                setActiveTab(resolveErrorTab(errs));
            },
            onSuccess: () => {
                setData('logo', null);
                setData('clear_logo', false);
                setData('apisunat_token', '');
                setData('clear_apisunat_token', false);
            },
        });
    };

    const stats = useMemo(() => {
        const hasLogo =
            Boolean(data.logo) ||
            Boolean(setting.logo_url && !data.clear_logo);

        return {
            identidadCompleta: Boolean(
                data.ruc && data.razon_social && data.direccion_fiscal,
            ),
            contactoCompleto: Boolean(
                data.email_institucional || data.telefono_principal,
            ),
            brandingCompleto:
                hasLogo || Boolean(data.color_primario || data.color_secundario),
            facturacionConfigurada: data.emite_comprobantes_sunat,
        };
    }, [data, setting.logo_url]);

    const headerHint =
        setting.nombre_comercial ?? setting.razon_social ?? null;

    const headerDescription = headerHint
        ? `Identidad, contacto, notificaciones y facturación de ${headerHint}.`
        : 'Identidad, contacto, notificaciones y facturación del taller.';

    const footerText = setting.actualizado_por
        ? `Última edición por ${setting.actualizado_por.name}`
        : setting.updated_at
          ? `Última edición: ${new Date(setting.updated_at).toLocaleString('es-PE', {
                dateStyle: 'medium',
                timeStyle: 'short',
            })}`
          : 'Sin ediciones registradas';

    return (
        <>
            <Head title="Configuración general" />

            <form
                onSubmit={onSubmit}
                className="flex flex-1 flex-col gap-5 p-4 pb-28 sm:p-6"
                noValidate
                encType="multipart/form-data"
            >
                <PageHeader
                    title="Configuración general"
                    description={headerDescription}
                    stats={[
                        {
                            label: 'Identidad',
                            value: stats.identidadCompleta
                                ? 'Completo'
                                : 'Incompleto',
                            variant: stats.identidadCompleta ? 'success' : 'warning',
                            icon: Building2,
                        },
                        {
                            label: 'Contacto',
                            value: stats.contactoCompleto
                                ? 'Completo'
                                : 'Incompleto',
                            variant: stats.contactoCompleto ? 'success' : 'warning',
                            icon: Phone,
                        },
                        {
                            label: 'Branding',
                            value: stats.brandingCompleto
                                ? 'Completo'
                                : 'Incompleto',
                            variant: stats.brandingCompleto ? 'success' : 'muted',
                            icon: Palette,
                        },
                        {
                            label: 'Facturación',
                            value: stats.facturacionConfigurada
                                ? 'Configurada'
                                : 'Sin configurar',
                            variant: stats.facturacionConfigurada
                                ? 'success'
                                : 'muted',
                            icon: stats.facturacionConfigurada
                                ? CheckCircle2
                                : XCircle,
                        },
                    ]}
                />

                <div className="flex items-start gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-sm">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300">
                        <Info className="size-4" strokeWidth={2.25} />
                    </span>
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold">
                            WhatsApp y correo incluidos en tu plan
                        </span>
                        <span className="text-xs leading-relaxed text-muted-foreground">
                            Lucode gestiona la integración con API SUNAT por
                            seguridad. Configura aquí tus preferencias de
                            notificación y los datos fiscales del taller.
                        </span>
                    </div>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as GeneralTab)}
                    className="gap-5"
                >
                    <div className="sticky top-0 z-30 -mx-2 border-b border-transparent bg-background/95 px-2 py-2 backdrop-blur-md supports-backdrop-filter:bg-background/85">
                        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
                            <TabsTrigger
                                value="taller"
                                className="group h-auto min-h-18 cursor-pointer justify-start gap-3 border-border/70 bg-card/70 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md data-[state=active]:border-sky-400 data-[state=active]:bg-sky-50 data-[state=active]:text-sky-950 dark:data-[state=active]:bg-sky-950/40 dark:data-[state=active]:text-sky-100"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300">
                                    <Building2 className="size-4.5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-semibold">
                                        Mi taller
                                    </span>
                                    <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:block">
                                        Identidad, contacto y marca
                                    </span>
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="notificaciones"
                                className="group h-auto min-h-18 cursor-pointer justify-start gap-3 border-border/70 bg-card/70 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md data-[state=active]:border-rose-400 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-950 dark:data-[state=active]:bg-rose-950/40 dark:data-[state=active]:text-rose-100"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300">
                                    <Bell className="size-4.5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-semibold">
                                        Notificaciones
                                    </span>
                                    <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:block">
                                        Recordatorios WhatsApp de citas
                                    </span>
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="facturacion"
                                className="group h-auto min-h-18 cursor-pointer justify-start gap-3 border-border/70 bg-card/70 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md data-[state=active]:border-emerald-400 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 dark:data-[state=active]:bg-emerald-950/40 dark:data-[state=active]:text-emerald-100"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                                    <Receipt className="size-4.5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-semibold">
                                        Facturación
                                    </span>
                                    <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:block">
                                        IGV, tickets y comprobantes SUNAT
                                    </span>
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent
                        value="taller"
                        className="space-y-5 data-[state=active]:animate-in data-[state=active]:fade-in-50"
                    >
                        <SectionCard
                            title="Identidad fiscal"
                            description="RUC, razón social y ubicación usada en documentos."
                            icon={Building2}
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className={fieldClass}>
                                    <Label htmlFor="ruc">RUC</Label>
                                    <Input
                                        id="ruc"
                                        value={data.ruc}
                                        onChange={(e) =>
                                            setData('ruc', e.target.value)
                                        }
                                        maxLength={11}
                                        placeholder="20123456789"
                                        disabled={!canUpdate}
                                    />
                                    {errors.ruc ? (
                                        <p className="text-xs text-destructive">
                                            {errors.ruc}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="razon_social">
                                        Razón social
                                    </Label>
                                    <Input
                                        id="razon_social"
                                        value={data.razon_social}
                                        onChange={(e) =>
                                            setData('razon_social', e.target.value)
                                        }
                                        disabled={!canUpdate}
                                    />
                                    {errors.razon_social ? (
                                        <p className="text-xs text-destructive">
                                            {errors.razon_social}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="nombre_comercial">
                                        Nombre comercial
                                    </Label>
                                    <Input
                                        id="nombre_comercial"
                                        value={data.nombre_comercial}
                                        onChange={(e) =>
                                            setData(
                                                'nombre_comercial',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!canUpdate}
                                    />
                                    {errors.nombre_comercial ? (
                                        <p className="text-xs text-destructive">
                                            {errors.nombre_comercial}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="direccion_fiscal">
                                        Dirección fiscal
                                    </Label>
                                    <Input
                                        id="direccion_fiscal"
                                        value={data.direccion_fiscal}
                                        onChange={(e) =>
                                            setData(
                                                'direccion_fiscal',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!canUpdate}
                                    />
                                    {errors.direccion_fiscal ? (
                                        <p className="text-xs text-destructive">
                                            {errors.direccion_fiscal}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="sm:col-span-2">
                                    <GeoCascadeFields
                                        departamentos={departamentos}
                                        value={geo}
                                        onChange={handleGeoChange}
                                        disabled={!canUpdate || processing}
                                        errors={{ distrito_id: errors.distrito_id }}
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard
                            title="Contacto"
                            description="Correo, teléfono y sitio web del taller."
                            icon={Phone}
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className={fieldClass}>
                                    <Label htmlFor="email_institucional">
                                        Correo
                                    </Label>
                                    <Input
                                        id="email_institucional"
                                        type="email"
                                        value={data.email_institucional}
                                        onChange={(e) =>
                                            setData(
                                                'email_institucional',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!canUpdate}
                                    />
                                    {errors.email_institucional ? (
                                        <p className="text-xs text-destructive">
                                            {errors.email_institucional}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="telefono_principal">
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="telefono_principal"
                                        value={data.telefono_principal}
                                        onChange={(e) =>
                                            setData(
                                                'telefono_principal',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!canUpdate}
                                    />
                                    {errors.telefono_principal ? (
                                        <p className="text-xs text-destructive">
                                            {errors.telefono_principal}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={`${fieldClass} sm:col-span-2`}>
                                    <Label htmlFor="web_url">Sitio web</Label>
                                    <Input
                                        id="web_url"
                                        type="url"
                                        value={data.web_url}
                                        onChange={(e) =>
                                            setData('web_url', e.target.value)
                                        }
                                        placeholder="https://…"
                                        disabled={!canUpdate}
                                    />
                                    {errors.web_url ? (
                                        <p className="text-xs text-destructive">
                                            {errors.web_url}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard
                            title="Marca"
                            description="Logo y colores del panel y de la pantalla de login."
                            icon={Palette}
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <LogoUploader
                                        currentUrl={setting.logo_url}
                                        file={data.logo}
                                        pendingRemoval={data.clear_logo}
                                        error={errors.logo}
                                        canUpdate={canUpdate}
                                        onSelect={(file) => {
                                            setData('logo', file);
                                            setData('clear_logo', false);
                                        }}
                                        onClearSelection={() => setData('logo', null)}
                                        onTogglePendingRemoval={() =>
                                            setData('clear_logo', !data.clear_logo)
                                        }
                                    />
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="color_primario">
                                        Color primario
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="color_primario"
                                            type="color"
                                            value={data.color_primario || '#EA580C'}
                                            onChange={(e) =>
                                                setData(
                                                    'color_primario',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            disabled={!canUpdate}
                                            className="h-10 w-14 cursor-pointer p-1"
                                        />
                                        <Input
                                            value={data.color_primario}
                                            onChange={(e) =>
                                                setData(
                                                    'color_primario',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="#EA580C"
                                            disabled={!canUpdate}
                                        />
                                    </div>
                                    {errors.color_primario ? (
                                        <p className="text-xs text-destructive">
                                            {errors.color_primario}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="color_secundario">
                                        Color secundario
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="color_secundario"
                                            type="color"
                                            value={
                                                data.color_secundario || '#FDBA74'
                                            }
                                            onChange={(e) =>
                                                setData(
                                                    'color_secundario',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            disabled={!canUpdate}
                                            className="h-10 w-14 cursor-pointer p-1"
                                        />
                                        <Input
                                            value={data.color_secundario}
                                            onChange={(e) =>
                                                setData(
                                                    'color_secundario',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="#FDBA74"
                                            disabled={!canUpdate}
                                        />
                                    </div>
                                    {errors.color_secundario ? (
                                        <p className="text-xs text-destructive">
                                            {errors.color_secundario}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent
                        value="notificaciones"
                        className="space-y-5 data-[state=active]:animate-in data-[state=active]:fade-in-50"
                    >
                        <SectionCard
                            title="Recordatorios de citas"
                            description="Notificaciones automáticas por WhatsApp cuando se agenda o se acerca una cita."
                            icon={Bell}
                        >
                            <div className="grid gap-3">
                                <ToggleRow
                                    id="notificar-cita-whatsapp"
                                    label="Notificar citas por WhatsApp"
                                    hint="Envía un mensaje al cliente cuando se confirma o reprograma una cita."
                                    checked={data.notificar_cita_whatsapp_activo}
                                    onChange={(value) =>
                                        setData(
                                            'notificar_cita_whatsapp_activo',
                                            value,
                                        )
                                    }
                                    disabled={!canUpdate}
                                />
                                <ToggleRow
                                    id="recordatorio-48h"
                                    label="Recordatorio 48 horas antes"
                                    hint="Avisa al cliente dos días antes de su cita programada."
                                    checked={data.recordatorio_48h_activo}
                                    onChange={(value) =>
                                        setData('recordatorio_48h_activo', value)
                                    }
                                    disabled={!canUpdate}
                                />
                                <ToggleRow
                                    id="recordatorio-2h"
                                    label="Recordatorio 2 horas antes"
                                    hint="Recordatorio final el mismo día, dos horas antes de la cita."
                                    checked={data.recordatorio_2h_activo}
                                    onChange={(value) =>
                                        setData('recordatorio_2h_activo', value)
                                    }
                                    disabled={!canUpdate}
                                />
                            </div>
                        </SectionCard>
                    </TabsContent>

                    <TabsContent
                        value="facturacion"
                        className="space-y-5 data-[state=active]:animate-in data-[state=active]:fade-in-50"
                    >
                        <SectionCard
                            title="Facturación y comprobantes SUNAT"
                            description="Moneda, IGV, tickets térmicos y emisión electrónica vía APISUNAT."
                            icon={Receipt}
                            badge={
                                <StatBadge
                                    label=""
                                    value={
                                        data.emite_comprobantes_sunat
                                            ? 'Configurada'
                                            : 'Sin configurar'
                                    }
                                    variant={
                                        data.emite_comprobantes_sunat
                                            ? 'success'
                                            : 'muted'
                                    }
                                    icon={
                                        data.emite_comprobantes_sunat
                                            ? CheckCircle2
                                            : XCircle
                                    }
                                />
                            }
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className={fieldClass}>
                                    <Label htmlFor="moneda">Moneda *</Label>
                                    <Select
                                        value={data.moneda}
                                        onValueChange={(value) =>
                                            setData('moneda', value)
                                        }
                                        disabled={!canUpdate}
                                    >
                                        <SelectTrigger id="moneda" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">
                                                PEN — Soles peruanos
                                            </SelectItem>
                                            <SelectItem value="USD">
                                                USD — Dólares
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.moneda ? (
                                        <p className="text-xs text-destructive">
                                            {errors.moneda}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="igv_afectacion">
                                        Afectación IGV (SUNAT) *
                                    </Label>
                                    <Select
                                        value={data.igv_afectacion}
                                        onValueChange={(value) => {
                                            setData('igv_afectacion', value);
                                            if (value !== 'gravado') {
                                                setData('igv_porcentaje', '0');
                                            }
                                        }}
                                        disabled={!canUpdate}
                                    >
                                        <SelectTrigger
                                            id="igv_afectacion"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gravado">
                                                Gravado (código 10)
                                            </SelectItem>
                                            <SelectItem value="exonerado">
                                                Exonerado (código 20)
                                            </SelectItem>
                                            <SelectItem value="inafecto">
                                                Inafecto (código 30)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Tasa estándar peruana: 18%. Solo aplica IGV
                                        si es Gravado.
                                    </p>
                                    {errors.igv_afectacion ? (
                                        <p className="text-xs text-destructive">
                                            {errors.igv_afectacion}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="igv_porcentaje">
                                        Porcentaje de IGV *
                                    </Label>
                                    <Input
                                        id="igv_porcentaje"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={data.igv_porcentaje}
                                        onChange={(e) =>
                                            setData(
                                                'igv_porcentaje',
                                                e.target.value,
                                            )
                                        }
                                        disabled={
                                            !canUpdate ||
                                            data.igv_afectacion !== 'gravado'
                                        }
                                    />
                                    {errors.igv_porcentaje ? (
                                        <p className="text-xs text-destructive">
                                            {errors.igv_porcentaje}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="ticket_ancho_mm">
                                        Ancho del ticket térmico
                                    </Label>
                                    <Select
                                        value={data.ticket_ancho_mm}
                                        onValueChange={(value) =>
                                            setData('ticket_ancho_mm', value)
                                        }
                                        disabled={!canUpdate}
                                    >
                                        <SelectTrigger
                                            id="ticket_ancho_mm"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="56">56 mm</SelectItem>
                                            <SelectItem value="58">
                                                58 mm (rollo angosto)
                                            </SelectItem>
                                            <SelectItem value="80">
                                                80 mm (rollo ancho)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.ticket_ancho_mm ? (
                                        <p className="text-xs text-destructive">
                                            {errors.ticket_ancho_mm}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="sm:col-span-2">
                                    <ToggleRow
                                        id="precio-incluye-igv"
                                        label="Los precios ingresados incluyen IGV"
                                        hint="Si está activo, el sistema calcula la base imponible desde el precio final. Si no, el IGV se suma al precio mostrado."
                                        checked={data.precio_incluye_igv}
                                        onChange={(value) =>
                                            setData('precio_incluye_igv', value)
                                        }
                                        disabled={
                                            !canUpdate ||
                                            data.igv_afectacion !== 'gravado'
                                        }
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <ToggleRow
                                        id="emite-comprobantes-sunat"
                                        label="Emitir comprobantes electrónicos SUNAT (boleta/factura)"
                                        hint="Si está desactivado, en ventas solo verás ticket interno. Actívalo cuando el token Lucode/APISUNAT del tenant esté listo."
                                        checked={data.emite_comprobantes_sunat}
                                        onChange={(value) =>
                                            setData(
                                                'emite_comprobantes_sunat',
                                                value,
                                            )
                                        }
                                        disabled={!canUpdate}
                                    />
                                    {errors.emite_comprobantes_sunat ? (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.emite_comprobantes_sunat}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="apisunat_mode">Ambiente</Label>
                                    <Select
                                        value={data.apisunat_mode}
                                        onValueChange={(value) =>
                                            setData('apisunat_mode', value)
                                        }
                                        disabled={!canUpdate}
                                    >
                                        <SelectTrigger
                                            id="apisunat_mode"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandbox">
                                                Pruebas (sandbox)
                                            </SelectItem>
                                            <SelectItem value="produccion">
                                                Producción
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.apisunat_mode ? (
                                        <p className="text-xs text-destructive">
                                            {errors.apisunat_mode}
                                        </p>
                                    ) : null}
                                </div>
                                <div className={fieldClass}>
                                    <Label htmlFor="apisunat_token">
                                        Token APISUNAT
                                    </Label>
                                    <Input
                                        id="apisunat_token"
                                        type="password"
                                        autoComplete="off"
                                        value={data.apisunat_token}
                                        onChange={(e) =>
                                            setData('apisunat_token', e.target.value)
                                        }
                                        placeholder={
                                            setting.apisunat_configurado
                                                ? 'Dejar vacío para conservar el actual'
                                                : 'Pega el token de Lucode / APISUNAT'
                                        }
                                        disabled={!canUpdate}
                                    />
                                    {errors.apisunat_token ? (
                                        <p className="text-xs text-destructive">
                                            {errors.apisunat_token}
                                        </p>
                                    ) : null}
                                </div>
                                {setting.apisunat_configurado ? (
                                    <div className="sm:col-span-2">
                                        <ToggleRow
                                            id="clear-apisunat-token"
                                            label="Quitar token"
                                            hint="Deja de emitir a SUNAT hasta que guardes un token nuevo."
                                            checked={data.clear_apisunat_token}
                                            onChange={(value) =>
                                                setData(
                                                    'clear_apisunat_token',
                                                    value,
                                                )
                                            }
                                            disabled={!canUpdate}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </SectionCard>
                    </TabsContent>
                </Tabs>

                {canUpdate ? (
                    <div className="fixed right-2 bottom-2 z-40 w-[calc(100%-1rem)] max-w-xl rounded-xl border border-border/70 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md md:w-[calc(100vw-var(--sidebar-width)-2rem)]">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck
                                    className="size-4 shrink-0 text-primary/70"
                                    strokeWidth={2.25}
                                />
                                <span className="truncate">{footerText}</span>
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <Loader2
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : recentlySuccessful ? (
                                    <CheckCircle2
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                ) : (
                                    <Save className="size-4" strokeWidth={2.5} />
                                )}
                                {recentlySuccessful
                                    ? 'Guardado'
                                    : 'Guardar cambios'}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </form>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Configuración' },
        { title: 'General', href: '/configuracion/general' },
    ],
};
