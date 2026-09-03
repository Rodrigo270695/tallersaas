<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ticket {{ $venta->numero }}</title>
    @php($tf = \App\Support\Caja\TicketAnchoMm::typography($ancho_mm))
    <style>
        :root {
            --paper: {{ $ancho_mm }}mm;
            --fs: {{ $tf['fs'] }}px;
            --fs-sm: {{ $tf['fs_sm'] }}px;
            --fs-title: {{ $tf['fs_title'] }}px;
            --fs-total: {{ $tf['fs_total'] }}px;
        }
        @page {
            size: {{ $ancho_mm }}mm auto;
            margin: 0;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
            width: var(--paper);
            max-width: var(--paper);
            font-family: Arial, Helvetica, sans-serif;
            font-size: var(--fs);
            font-weight: 500;
            line-height: 1.25;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .pad { padding: 2mm {{ $tf['pad_x'] }} 3mm; }
        .center { text-align: center; }
        .head p { margin: 0 0 1px; }
        .logo-wrap { margin: 0 auto 3px; }
        .logo-ticket {
            display: block;
            margin: 0 auto;
            max-width: 85%;
            max-height: {{ $tf['logo_max'] }}mm;
            width: auto;
            height: auto;
            object-fit: contain;
        }
        .muted { color: #000; font-size: var(--fs-sm); font-weight: 500; }
        .title {
            font-weight: 700;
            font-size: var(--fs-title);
            margin: 0 0 2px;
            line-height: 1.2;
        }
        .rule {
            border: 0;
            border-top: 1px dashed #000;
            margin: 4px 0;
        }
        .doc-head { margin: 2px 0 4px; }
        .doc-head .subtitle {
            margin: 0 0 3px;
            font-size: var(--fs-sm);
            letter-spacing: 0.02em;
        }
        .badge {
            display: inline-block;
            padding: 0 5px;
            border: 1px solid #000;
            font-size: var(--fs-sm);
            font-weight: 700;
            letter-spacing: 0.06em;
            line-height: 1.35;
        }
        .meta {
            width: 100%;
            border-collapse: collapse;
            font-size: var(--fs);
            margin: 0 0 2px;
        }
        .meta td {
            padding: 1px 0;
            vertical-align: top;
            line-height: 1.3;
        }
        .meta .lbl {
            color: #000;
            font-size: var(--fs-sm);
            font-weight: 500;
            width: 36%;
            padding-right: 3px;
            white-space: nowrap;
        }
        .meta .val {
            font-weight: 600;
            text-align: right;
            word-break: break-word;
        }
        .meta-section { margin-bottom: 3px; }
        .meta-section-title {
            font-size: var(--fs-sm);
            font-weight: 700;
            color: #000;
            margin: 0 0 2px;
            padding-bottom: 1px;
            border-bottom: 1px dotted #000;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        table.items {
            width: 100%;
            border-collapse: collapse;
            font-size: var(--fs-sm);
            margin-top: 2px;
        }
        table.items th,
        table.items td {
            text-align: left;
            vertical-align: top;
            padding: 2px 0;
            word-break: break-word;
        }
        table.items th {
            border-bottom: 1px solid #000;
            font-size: var(--fs-sm);
            padding-bottom: 3px;
        }
        table.items .num {
            text-align: right;
            white-space: nowrap;
            width: 22%;
        }
        table.items .col-qty { width: 18%; }
        table.items tfoot td {
            padding-top: 3px;
            border: 0;
            vertical-align: baseline;
        }
        table.items tfoot tr:first-child td {
            border-top: 1px solid #000;
            padding-top: 4px;
        }
        table.items .tot-label {
            text-align: left;
            font-weight: 600;
        }
        table.items tfoot .num { font-weight: 600; }
        table.items tfoot tr:last-child .num { font-size: var(--fs-total); }
        .pay-block { margin-top: 2px; }
        .notes-block {
            margin-top: 2px;
            font-size: var(--fs-sm);
            line-height: 1.3;
        }
        .notes-block .lbl {
            color: #000;
            font-weight: 500;
            display: block;
            margin-bottom: 1px;
        }
        .footer {
            margin-top: 5px;
            font-size: {{ $tf['footer'] }}px;
            line-height: 1.25;
            color: #000;
            font-weight: 500;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="pad">
        <div class="center head">
            @if(! empty($clinic_logo_url))
                <div class="logo-wrap">
                    <img src="{{ $clinic_logo_url }}" alt="" class="logo-ticket">
                </div>
            @endif
            <p class="title">{{ $clinic_nombre }}</p>
            @if($clinic_ruc)
                <p class="muted">RUC {{ $clinic_ruc }}</p>
            @endif
            @if($clinic_direccion)
                <p class="muted">{{ $clinic_direccion }}</p>
            @endif
            @if($clinic_telefono)
                <p class="muted">Tel. {{ $clinic_telefono }}</p>
            @endif
        </div>

        <hr class="rule">

        <div class="center doc-head">
            <p class="subtitle muted">Comprobante de cobro en caja</p>
            <span class="badge">{{ $estado_label }}</span>
        </div>

        <div class="meta-section">
            <p class="meta-section-title">Venta</p>
            <table class="meta" role="presentation">
                <tr>
                    <td class="lbl">N.º venta</td>
                    <td class="val">{{ $venta->numero }}</td>
                </tr>
                <tr>
                    <td class="lbl">Fecha de cobro</td>
                    <td class="val">{{ $fecha_cobro }}</td>
                </tr>
                @if($sede_nombre)
                    <tr>
                        <td class="lbl">Sede</td>
                        <td class="val">{{ $sede_nombre }}</td>
                    </tr>
                @endif
                @if($orden_numero)
                    <tr>
                        <td class="lbl">OT</td>
                        <td class="val">{{ $orden_numero }}</td>
                    </tr>
                @endif
                @if(! empty($cpe_numero))
                    <tr>
                        <td class="lbl">CPE</td>
                        <td class="val">{{ $cpe_numero }}</td>
                    </tr>
                @endif
            </table>
        </div>

        <div class="meta-section">
            <p class="meta-section-title">Cliente</p>
            <table class="meta" role="presentation">
                <tr>
                    <td class="lbl">Cliente</td>
                    <td class="val">{{ $cliente_nombre }}</td>
                </tr>
                @if($cliente_doc)
                    <tr>
                        <td class="lbl">Doc.</td>
                        <td class="val">{{ $cliente_doc }}</td>
                    </tr>
                @endif
                @if($vehiculo_placa)
                    <tr>
                        <td class="lbl">Placa</td>
                        <td class="val">{{ $vehiculo_placa }}</td>
                    </tr>
                @endif
            </table>
        </div>

        @if($cajero_nombre)
            <div class="meta-section">
                <table class="meta" role="presentation">
                    <tr>
                        <td class="lbl">Cajero</td>
                        <td class="val">{{ $cajero_nombre }}</td>
                    </tr>
                </table>
            </div>
        @endif

        <hr class="rule">

        <table class="items">
            <thead>
            <tr>
                <th>Producto</th>
                <th class="num col-qty">Cant.</th>
                <th class="num">Subtotal</th>
            </tr>
            </thead>
            <tbody>
            @foreach($lineas as $ln)
                <tr>
                    <td>{{ $ln['descripcion'] }}</td>
                    <td class="num">{{ $ln['cantidad'] }}</td>
                    <td class="num">{{ $ln['subtotal'] }}</td>
                </tr>
            @endforeach
            </tbody>
            <tfoot>
            <tr>
                <td class="tot-label">Subtotal (sin IGV)</td>
                <td></td>
                <td class="num">{{ $moneda }} {{ number_format((float) $venta->subtotal, 2, '.', '') }}</td>
            </tr>
            @if((float) $venta->descuento_monto > 0)
                <tr>
                    <td class="tot-label">Descuento</td>
                    <td></td>
                    <td class="num">- {{ $moneda }} {{ number_format((float) $venta->descuento_monto, 2, '.', '') }}</td>
                </tr>
            @endif
            <tr>
                <td class="tot-label">IGV ({{ $igv_porcentaje }}%)</td>
                <td></td>
                <td class="num">{{ $moneda }} {{ number_format((float) $venta->igv_monto, 2, '.', '') }}</td>
            </tr>
            <tr>
                <td class="tot-label">TOTAL</td>
                <td></td>
                <td class="num">{{ $moneda }} {{ number_format((float) $venta->total, 2, '.', '') }}</td>
            </tr>
            </tfoot>
        </table>

        @if($metodo_pago_label || ! empty($pagos))
            <hr class="rule">
            <div class="pay-block">
                <p class="meta-section-title">Pago</p>
                <table class="meta" role="presentation">
                    @if(! empty($pagos) && count($pagos) > 1)
                        @foreach($pagos as $pago)
                            <tr>
                                <td class="lbl">{{ $pago['metodo_label'] }}</td>
                                <td class="val">{{ $moneda }} {{ $pago['monto'] }}</td>
                            </tr>
                            @if(! empty($pago['es_efectivo']) && $pago['monto_recibido'] !== null)
                                <tr>
                                    <td class="lbl">Monto recibido</td>
                                    <td class="val">{{ $moneda }} {{ $pago['monto_recibido'] }}</td>
                                </tr>
                                @if($pago['vuelto'] !== null)
                                    <tr>
                                        <td class="lbl">Vuelto</td>
                                        <td class="val">{{ $moneda }} {{ $pago['vuelto'] }}</td>
                                    </tr>
                                @endif
                            @endif
                        @endforeach
                    @else
                        <tr>
                            <td class="lbl">Método de pago</td>
                            <td class="val">{{ $metodo_pago_label }}</td>
                        </tr>
                        @if($venta->metodo_pago === 'efectivo' && $venta->monto_recibido !== null)
                            <tr>
                                <td class="lbl">Monto recibido</td>
                                <td class="val">{{ $moneda }} {{ number_format((float) $venta->monto_recibido, 2, '.', '') }}</td>
                            </tr>
                            @if($venta->vuelto !== null)
                                <tr>
                                    <td class="lbl">Vuelto</td>
                                    <td class="val">{{ $moneda }} {{ number_format((float) $venta->vuelto, 2, '.', '') }}</td>
                                </tr>
                            @endif
                        @endif
                    @endif
                </table>
            </div>
        @endif

        @if($venta->notas)
            <hr class="rule">
            <div class="notes-block">
                <span class="lbl">Notas</span>
                {{ $venta->notas }}
            </div>
        @endif

        <div class="footer">
            Documento interno de caja. No es comprobante fiscal SUNAT salvo que la venta tenga CPE electrónico emitido.<br>
            Ancho de impresión configurado: {{ $ancho_mm }} mm.
        </div>
    </div>
@if(! empty($auto_print))
    <script>
        window.addEventListener('load', function () {
            setTimeout(function () { window.print(); }, 350);
        });
    </script>
@endif
</body>
</html>
