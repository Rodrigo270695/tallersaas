<?php

namespace App\Http\Controllers;

use App\Http\Requests\TallerSettingRequest;
use App\Models\Departamento;
use App\Models\TallerSetting;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TallerSettingController extends Controller
{
    public function show(TenantManager $tenants): Response
    {
        $setting = TallerSetting::current()
            ->load('actualizadoPor:id,name,email', 'distritoModel.provincia.departamento');

        $tenant = $tenants->current();

        $departamentos = Departamento::query()
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('configuracion/general/index', [
            'setting' => $this->presentSetting($setting),
            'taller_header' => $tenant === null ? null : [
                'id' => $tenant->id(),
                'slug' => $tenant->slug,
                'razon_social' => $tenant->tenant->razon_social ?? null,
                'nombre_comercial' => $tenant->tenant->nombre_comercial ?? null,
            ],
            'departamentos' => $departamentos,
        ]);
    }

    public function update(TallerSettingRequest $request, TenantManager $tenants): RedirectResponse
    {
        $setting = TallerSetting::current();
        $data = $request->validated();

        $setting->fill([
            'ruc' => $data['ruc'] ?? null,
            'razon_social' => $data['razon_social'] ?? null,
            'nombre_comercial' => $data['nombre_comercial'] ?? null,
            'direccion_fiscal' => $data['direccion_fiscal'] ?? null,
            'distrito_id' => $data['distrito_id'] ?? null,
            'color_primario' => $data['color_primario'] ?? null,
            'color_secundario' => $data['color_secundario'] ?? null,
            'email_institucional' => $data['email_institucional'] ?? null,
            'telefono_principal' => $data['telefono_principal'] ?? null,
            'web_url' => $data['web_url'] ?? null,
            'moneda' => $data['moneda'],
            'igv_porcentaje' => $data['igv_porcentaje'],
            'precio_incluye_igv' => (bool) ($data['precio_incluye_igv'] ?? $setting->precio_incluye_igv),
            'emite_comprobantes_sunat' => (bool) ($data['emite_comprobantes_sunat'] ?? false),
            'apisunat_mode' => $data['apisunat_mode'] ?? $setting->apisunat_mode ?? 'sandbox',
            'updated_by_id' => Auth::id(),
        ]);

        $this->applyApisunatToken($setting, $data);

        $this->applyLogo($setting, $request, $tenants);
        $setting->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Configuración actualizada correctamente.']);

        return back();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function applyApisunatToken(TallerSetting $setting, array $data): void
    {
        if (($data['clear_apisunat_token'] ?? false) === true) {
            $setting->apisunat_token_enc = null;
            $setting->apisunat_configurado = false;

            return;
        }

        $token = trim((string) ($data['apisunat_token'] ?? ''));
        if ($token === '') {
            return;
        }

        $setting->apisunat_token_enc = Crypt::encryptString($token);
        $setting->apisunat_configurado = true;
    }

    private function applyLogo(
        TallerSetting $setting,
        TallerSettingRequest $request,
        TenantManager $tenants,
    ): void {
        $disk = Storage::disk('public');

        if (($request->validated('clear_logo') ?? false) === true) {
            if ($setting->logo_path && $disk->exists($setting->logo_path)) {
                $disk->delete($setting->logo_path);
            }
            $setting->logo_path = null;

            return;
        }

        if (! $request->hasFile('logo')) {
            return;
        }

        $slug = $tenants->current()?->slug ?? 'shared';
        $previous = $setting->logo_path;
        $file = $request->file('logo');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png');
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = "tenants/{$slug}/logos/{$filename}";

        $disk->putFileAs(
            "tenants/{$slug}/logos",
            $file,
            $filename,
            'public',
        );

        $setting->logo_path = $path;

        if ($previous && $previous !== $path && $disk->exists($previous)) {
            $disk->delete($previous);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function presentSetting(TallerSetting $setting): array
    {
        $distrito = $setting->distritoModel;

        return [
            'id' => $setting->id,
            'ruc' => $setting->ruc,
            'razon_social' => $setting->razon_social,
            'nombre_comercial' => $setting->nombre_comercial,
            'direccion_fiscal' => $setting->direccion_fiscal,
            'distrito_id' => $setting->distrito_id,
            'distrito_model' => $distrito === null ? null : [
                'id' => $distrito->id,
                'name' => $distrito->name,
                'provincia_id' => $distrito->provincia_id,
                'provincia' => $distrito->provincia === null ? null : [
                    'id' => $distrito->provincia->id,
                    'name' => $distrito->provincia->name,
                    'departamento_id' => $distrito->provincia->departamento_id,
                    'departamento' => $distrito->provincia->departamento === null ? null : [
                        'id' => $distrito->provincia->departamento->id,
                        'name' => $distrito->provincia->departamento->name,
                    ],
                ],
            ],
            'logo_url' => $setting->logo_url,
            'color_primario' => $setting->color_primario,
            'color_secundario' => $setting->color_secundario,
            'email_institucional' => $setting->email_institucional,
            'telefono_principal' => $setting->telefono_principal,
            'web_url' => $setting->web_url,
            'moneda' => $setting->moneda,
            'igv_porcentaje' => (float) $setting->igv_porcentaje,
            'precio_incluye_igv' => $setting->precio_incluye_igv,
            'emite_comprobantes_sunat' => (bool) $setting->emite_comprobantes_sunat,
            'apisunat_configurado' => ApisunatCredentialResolver::estaConfigurado($setting),
            'apisunat_mode' => $setting->apisunat_mode ?: 'sandbox',
            'updated_at' => $setting->updated_at?->toIso8601String(),
            'actualizado_por' => $setting->actualizadoPor === null ? null : [
                'id' => $setting->actualizadoPor->id,
                'name' => $setting->actualizadoPor->name,
                'email' => $setting->actualizadoPor->email,
            ],
        ];
    }
}
