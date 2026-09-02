import { Head, useForm } from '@inertiajs/react';
import { Building2, FileCheck, Loader2, Palette, Receipt, Save } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/data-page';
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
    precio_incluye_igv: boolean;
    emite_comprobantes_sunat: boolean;
    apisunat_configurado: boolean;
    apisunat_mode: 'sandbox' | 'produccion';
};

type GeneralIndexProps = {
    setting: TallerSettingPayload;
    departamentos: readonly GeoOption[];
};

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
    precio_incluye_igv: boolean;
    emite_comprobantes_sunat: boolean;
    apisunat_token: string;
    clear_apisunat_token: boolean;
    apisunat_mode: string;
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

export default function Index({ setting, departamentos }: GeneralIndexProps) {
    const { can } = usePermission();
    const canUpdate = can('config-general.update');

    const { data, setData, post, processing, errors } = useForm<FormData>({
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
        precio_incluye_igv: setting.precio_incluye_igv,
        emite_comprobantes_sunat: setting.emite_comprobantes_sunat ?? false,
        apisunat_token: '',
        clear_apisunat_token: false,
        apisunat_mode: setting.apisunat_mode || 'sandbox',
        apisunat_token: '',
        clear_apisunat_token: false,
        apisunat_mode: setting.apisunat_mode || 'sandbox',
        logo: null,
        clear_logo: false,
        _method: 'put',
    });

    const [geo, setGeo] = useState<GeoCascadeValue>(() => buildGeo(setting));

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
            onSuccess: () => {
                setData('logo', null);
                setData('clear_logo', false);
                setData('apisunat_token', '');
                setData('clear_apisunat_token', false);
            },
        });
    };

    const lastSavedHint = useMemo(() => {
        if (setting.nombre_comercial || setting.razon_social) {
            return setting.nombre_comercial ?? setting.razon_social;
        }

        return null;
    }, [setting.nombre_comercial, setting.razon_social]);

    return (
        <>
            <Head title="Configuración general" />

            <form
                onSubmit={onSubmit}
                className="flex flex-1 flex-col gap-5 p-4 sm:p-6"
            >
                <PageHeader
                    title="Configuración general"
                    description={
                        lastSavedHint
                            ? `Identidad, logo, colores y datos fiscales de ${lastSavedHint}.`
                            : 'Identidad, logo, colores y datos fiscales del taller.'
                    }
                    action={
                        canUpdate ? (
                            <Button
                                type="submit"
                                disabled={processing}
                                className="cursor-pointer gap-2"
                            >
                                {processing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" strokeWidth={2.25} />
                                )}
                                Guardar
                            </Button>
                        ) : undefined
                    }
                />

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
                                onChange={(e) => setData('ruc', e.target.value)}
                                maxLength={11}
                                placeholder="20123456789"
                                disabled={!canUpdate}
                            />
                            {errors.ruc && (
                                <p className="text-xs text-destructive">{errors.ruc}</p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="razon_social">Razón social</Label>
                            <Input
                                id="razon_social"
                                value={data.razon_social}
                                onChange={(e) => setData('razon_social', e.target.value)}
                                disabled={!canUpdate}
                            />
                            {errors.razon_social && (
                                <p className="text-xs text-destructive">{errors.razon_social}</p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="nombre_comercial">Nombre comercial</Label>
                            <Input
                                id="nombre_comercial"
                                value={data.nombre_comercial}
                                onChange={(e) =>
                                    setData('nombre_comercial', e.target.value)
                                }
                                disabled={!canUpdate}
                            />
                            {errors.nombre_comercial && (
                                <p className="text-xs text-destructive">
                                    {errors.nombre_comercial}
                                </p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="direccion_fiscal">Dirección fiscal</Label>
                            <Input
                                id="direccion_fiscal"
                                value={data.direccion_fiscal}
                                onChange={(e) =>
                                    setData('direccion_fiscal', e.target.value)
                                }
                                disabled={!canUpdate}
                            />
                            {errors.direccion_fiscal && (
                                <p className="text-xs text-destructive">
                                    {errors.direccion_fiscal}
                                </p>
                            )}
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
                            <Label htmlFor="color_primario">Color primario</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="color_primario"
                                    type="color"
                                    value={data.color_primario || '#EA580C'}
                                    onChange={(e) =>
                                        setData('color_primario', e.target.value.toUpperCase())
                                    }
                                    disabled={!canUpdate}
                                    className="h-10 w-14 cursor-pointer p-1"
                                />
                                <Input
                                    value={data.color_primario}
                                    onChange={(e) => setData('color_primario', e.target.value)}
                                    placeholder="#EA580C"
                                    disabled={!canUpdate}
                                />
                            </div>
                            {errors.color_primario && (
                                <p className="text-xs text-destructive">
                                    {errors.color_primario}
                                </p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="color_secundario">Color secundario</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="color_secundario"
                                    type="color"
                                    value={data.color_secundario || '#FDBA74'}
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
                                        setData('color_secundario', e.target.value)
                                    }
                                    placeholder="#FDBA74"
                                    disabled={!canUpdate}
                                />
                            </div>
                            {errors.color_secundario && (
                                <p className="text-xs text-destructive">
                                    {errors.color_secundario}
                                </p>
                            )}
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Contacto y facturación"
                    description="Datos visibles al cliente y reglas de IGV."
                    icon={Receipt}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className={fieldClass}>
                            <Label htmlFor="email_institucional">Correo</Label>
                            <Input
                                id="email_institucional"
                                type="email"
                                value={data.email_institucional}
                                onChange={(e) =>
                                    setData('email_institucional', e.target.value)
                                }
                                disabled={!canUpdate}
                            />
                            {errors.email_institucional && (
                                <p className="text-xs text-destructive">
                                    {errors.email_institucional}
                                </p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="telefono_principal">Teléfono</Label>
                            <Input
                                id="telefono_principal"
                                value={data.telefono_principal}
                                onChange={(e) =>
                                    setData('telefono_principal', e.target.value)
                                }
                                disabled={!canUpdate}
                            />
                            {errors.telefono_principal && (
                                <p className="text-xs text-destructive">
                                    {errors.telefono_principal}
                                </p>
                            )}
                        </div>
                        <div className={`${fieldClass} sm:col-span-2`}>
                            <Label htmlFor="web_url">Sitio web</Label>
                            <Input
                                id="web_url"
                                type="url"
                                value={data.web_url}
                                onChange={(e) => setData('web_url', e.target.value)}
                                placeholder="https://…"
                                disabled={!canUpdate}
                            />
                            {errors.web_url && (
                                <p className="text-xs text-destructive">{errors.web_url}</p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="moneda">Moneda</Label>
                            <Select
                                value={data.moneda}
                                onValueChange={(value) => setData('moneda', value)}
                                disabled={!canUpdate}
                            >
                                <SelectTrigger id="moneda" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.moneda && (
                                <p className="text-xs text-destructive">{errors.moneda}</p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="igv_porcentaje">IGV (%)</Label>
                            <Input
                                id="igv_porcentaje"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={data.igv_porcentaje}
                                onChange={(e) => setData('igv_porcentaje', e.target.value)}
                                disabled={!canUpdate}
                            />
                            {errors.igv_porcentaje && (
                                <p className="text-xs text-destructive">
                                    {errors.igv_porcentaje}
                                </p>
                            )}
                        </div>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:col-span-2">
                            <Checkbox
                                checked={data.precio_incluye_igv}
                                onCheckedChange={(checked) =>
                                    setData('precio_incluye_igv', checked === true)
                                }
                                disabled={!canUpdate}
                                className="mt-0.5"
                            />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">
                                    Los precios incluyen IGV
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Si está activo, el IGV se extrae del precio de lista.
                                </span>
                            </div>
                        </label>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Comprobantes SUNAT (APISUNAT)"
                    description="Emite boletas y facturas después del cobro. El token nunca se muestra."
                    icon={FileCheck}
                    badge={
                        setting.apisunat_configurado ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Token configurado
                            </span>
                        ) : (
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                                Sin token
                            </span>
                        )
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:col-span-2">
                            <Checkbox
                                checked={data.emite_comprobantes_sunat}
                                onCheckedChange={(checked) =>
                                    setData('emite_comprobantes_sunat', checked === true)
                                }
                                disabled={!canUpdate}
                                className="mt-0.5"
                            />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">
                                    Emitir boletas y facturas a SUNAT
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Si el cobro elige boleta o factura, se envía a APISUNAT. Un
                                    rechazo de SUNAT no anula el cobro.
                                </span>
                            </div>
                        </label>
                        <div className={fieldClass}>
                            <Label htmlFor="apisunat_mode">Ambiente</Label>
                            <Select
                                value={data.apisunat_mode}
                                onValueChange={(value) => setData('apisunat_mode', value)}
                                disabled={!canUpdate}
                            >
                                <SelectTrigger id="apisunat_mode" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sandbox">Pruebas (sandbox)</SelectItem>
                                    <SelectItem value="produccion">Producción</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.apisunat_mode && (
                                <p className="text-xs text-destructive">{errors.apisunat_mode}</p>
                            )}
                        </div>
                        <div className={fieldClass}>
                            <Label htmlFor="apisunat_token">Token APISUNAT</Label>
                            <Input
                                id="apisunat_token"
                                type="password"
                                autoComplete="off"
                                value={data.apisunat_token}
                                onChange={(e) => setData('apisunat_token', e.target.value)}
                                placeholder={
                                    setting.apisunat_configurado
                                        ? 'Dejar vacío para conservar el actual'
                                        : 'Pega el token de Lucode / APISUNAT'
                                }
                                disabled={!canUpdate}
                            />
                            {errors.apisunat_token && (
                                <p className="text-xs text-destructive">{errors.apisunat_token}</p>
                            )}
                        </div>
                        {setting.apisunat_configurado && (
                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:col-span-2">
                                <Checkbox
                                    checked={data.clear_apisunat_token}
                                    onCheckedChange={(checked) =>
                                        setData('clear_apisunat_token', checked === true)
                                    }
                                    disabled={!canUpdate}
                                    className="mt-0.5"
                                />
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium">Quitar token</span>
                                    <span className="text-xs text-muted-foreground">
                                        Deja de emitir a SUNAT hasta que guardes un token nuevo.
                                    </span>
                                </div>
                            </label>
                        )}
                    </div>
                </SectionCard>
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
