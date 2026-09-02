<?php

namespace App\Services\Fel;

use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Models\TallerSetting;
use App\Models\Venta;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Support\Fel\FelReceptorResolver;
use App\Support\Fel\FelSerieResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

final class FelEmisionVentaService
{
    public function __construct(
        private readonly ApisunatClient $apisunat,
        private readonly FelSerieResolver $felSeries,
    ) {}

    public function puedeEmitir(TallerSetting $setting, Venta $venta): bool
    {
        if ($venta->estado !== Venta::ESTADO_PAGADO) {
            return false;
        }

        if (! $this->estadoPermiteEmision($venta)) {
            return false;
        }

        $tipo = $venta->tipo_comprobante_sunat;

        return FelSerie::esTipoSunat($tipo)
            && (bool) $setting->emite_comprobantes_sunat
            && ApisunatCredentialResolver::estaConfigurado($setting);
    }

    public function emitir(Venta $venta): FelDocument
    {
        $setting = TallerSetting::current();

        if (! $this->puedeEmitir($setting, $venta)) {
            throw ValidationException::withMessages([
                'venta' => 'Esta venta no se puede emitir a SUNAT. Revisa caja, tipo de comprobante y APISUNAT.',
            ]);
        }

        $credenciales = ApisunatCredentialResolver::fromTallerSetting($setting);
        $venta->loadMissing(['lineas', 'cliente']);
        $receptor = FelReceptorResolver::datosReceptor($venta->cliente);
        $tipoComprobante = (int) $venta->tipo_comprobante_sunat;

        if ($tipoComprobante === FelSerie::TIPO_FACTURA && (int) $receptor['tipo_doc'] !== 6) {
            throw ValidationException::withMessages([
                'venta' => 'La factura exige un cliente con RUC.',
            ]);
        }

        $rejectedMessage = null;

        $documento = DB::transaction(function () use ($venta, $setting, $credenciales, $receptor, $tipoComprobante, &$rejectedMessage): FelDocument {
            $venta = Venta::query()->whereKey($venta->id)->lockForUpdate()->firstOrFail();
            $venta->loadMissing(['lineas', 'cliente']);

            if (! $this->estadoPermiteEmision($venta)) {
                throw ValidationException::withMessages([
                    'venta' => 'Esta venta ya tiene un comprobante en proceso o emitido.',
                ]);
            }

            $serie = $this->felSeries->resolverParaVenta($venta, $tipoComprobante, true);
            $correlativo = ((int) $serie->ultimo_correlativo) + 1;
            $numeroCompleto = $serie->serie.'-'.str_pad((string) $correlativo, 8, '0', STR_PAD_LEFT);
            $emisionModo = $credenciales['mode'];

            $documento = FelDocument::query()->updateOrCreate(
                ['venta_id' => $venta->id],
                [
                    'fel_serie_id' => $serie->id,
                    'tipo_comprobante' => $tipoComprobante,
                    'serie' => $serie->serie,
                    'correlativo' => $correlativo,
                    'numero_completo' => $numeroCompleto,
                    'receptor_tipo_doc' => $receptor['tipo_doc'],
                    'receptor_num_doc' => $receptor['num_doc'],
                    'receptor_nombre' => $receptor['nombre'],
                    'subtotal' => $venta->subtotal,
                    'igv_monto' => $venta->igv_monto,
                    'total' => $venta->total,
                    'moneda' => $venta->moneda,
                    'estado' => FelDocument::ESTADO_PENDIENTE,
                    'error_mensaje' => null,
                    'emitido_at' => null,
                    'apisunat_mode' => $emisionModo,
                ],
            );

            $venta->update([
                'fel_document_id' => $documento->id,
                'fel_estado' => Venta::FEL_PENDIENTE,
            ]);

            $payload = $this->apisunat->construirPayload(
                $venta,
                $setting,
                $tipoComprobante,
                $serie->serie,
                $correlativo,
                $receptor,
            );

            try {
                $respuesta = $this->apisunat->generarComprobante($credenciales, $payload);
            } catch (RuntimeException $e) {
                $this->marcarRechazado($documento, $venta, $e->getMessage(), $emisionModo);
                $rejectedMessage = $e->getMessage();

                return $documento->fresh() ?? $documento;
            }

            if (! $this->apisunat->respuestaExitosa($respuesta)) {
                $mensaje = $this->apisunat->extraerMensajeError($respuesta);
                $this->marcarRechazado($documento, $venta, $mensaje, $emisionModo);
                $rejectedMessage = $mensaje;

                return $documento->fresh() ?? $documento;
            }

            $enlaces = $this->apisunat->extraerEnlaces($respuesta);
            $estadoApisunat = strtoupper((string) (($respuesta['payload'] ?? [])['estado'] ?? ''));

            $serie->update(['ultimo_correlativo' => $correlativo]);

            $documento->update([
                'estado' => FelDocument::ESTADO_EMITIDO,
                'nubefact_id' => $estadoApisunat !== '' ? 'apisunat:'.$estadoApisunat : null,
                'url_pdf' => $enlaces['pdf'],
                'url_xml' => $enlaces['xml'],
                'url_cdr' => $enlaces['cdr'],
                'enlace_consulta' => $enlaces['consulta'],
                'apisunat_payload' => $respuesta,
                'apisunat_mode' => $emisionModo,
                'error_mensaje' => null,
                'emitido_at' => now(),
            ]);

            $venta->update(['fel_estado' => Venta::FEL_EMITIDO]);

            return $documento->fresh() ?? $documento;
        });

        if ($rejectedMessage !== null) {
            throw ValidationException::withMessages([
                'venta' => $rejectedMessage,
            ]);
        }

        return $documento;
    }

    private function estadoPermiteEmision(Venta $venta): bool
    {
        return in_array($venta->fel_estado, [null, Venta::FEL_PENDIENTE, Venta::FEL_RECHAZADO], true);
    }

    private function marcarRechazado(FelDocument $documento, Venta $venta, string $mensaje, string $mode): void
    {
        $documento->update([
            'estado' => FelDocument::ESTADO_RECHAZADO,
            'error_mensaje' => mb_substr($mensaje, 0, 2000),
            'apisunat_mode' => $mode,
        ]);

        $venta->update(['fel_estado' => Venta::FEL_RECHAZADO]);
    }
}
