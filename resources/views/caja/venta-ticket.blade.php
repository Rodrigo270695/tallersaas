<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ticket {{ $venta->numero }}</title>
    <style>
        :root { --paper: {{ (int) $ancho_mm }}mm; }
        @page { size: {{ (int) $ancho_mm }}mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
            width: var(--paper);
            max-width: var(--paper);
            font-family: Arial, Helvetica, sans-serif;
            font-size: {{ (int) $ancho_mm <= 58 ? 11 : 12 }}px;
            line-height: 1.3;
            color: #000;
            background: #fff;
        }
        .pad { padding: 3mm 2.5mm 4mm; }
        .center { text-align: center; }
        .muted { font-size: 10px; }
        .title { font-weight: 700; font-size: 14px; margin: 0 0 2px; }
        .rule { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        .badge {
            display: inline-block;
            padding: 1px 6px;
            border: 1px solid #000;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
        }
        table { width: 100%; border-collapse: collapse; }
        .meta td { padding: 1px 0; vertical-align: top; }
        .meta .lbl { width: 38%; font-size: 10px; }
        .meta .val { text-align: right; font-weight: 600; word-break: break-word; }
        .items th, .items td { padding: 2px 0; vertical-align: top; text-align: left; }
        .items th { border-bottom: 1px solid #000; font-size: 10px; }
        .items .qty { width: 14%; text-align: right; }
        .items .pu, .items .imp { width: 22%; text-align: right; white-space: nowrap; }
        .totales td { padding: 2px 0; }
        .totales .lbl { text-align: left; }
        .totales .val { text-align: right; font-weight: 600; }
        .totales .grand .val { font-size: 15px; font-weight: 700; }
        .actions {
            position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 10;
        }
        .actions a, .actions button {
            font: 600 13px/1 Arial, sans-serif;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #d4d4d8;
            background: #fff;
            color: #18181b;
            cursor: pointer;
            text-decoration: none;
        }
        .actions .primary { background: #18181b; color: #fff; border-color: #18181b; }
        @media print {
            .actions { display: none !important; }
            body { width: var(--paper); }
        }
    </style>
</head>
<body>
    <div class="actions">
        <button type="button" class="primary" onclick="window.print()">Imprimir</button>
        <a href="{{ route('caja.ventas.index') }}">Volver a ventas</a>
    </div>

    <div class="pad">
        <div class="center head">
            @if ($setting->logo_url)
                <img src="{{ $setting->logo_url }}" alt="" style="max-width:85%;max-height:18mm;margin:0 auto 4px;display:block;">
            @endif
            <p class="title">{{ $taller_nombre }}</p>
            @if ($setting->ruc)
                <p class="muted">RUC {{ $setting->ruc }}</p>
            @endif
            @if ($setting->direccion_fiscal)
                <p class="muted">{{ $setting->direccion_fiscal }}</p>
            @endif
            @if ($setting->telefono_principal)
                <p class="muted">Tel. {{ $setting->telefono_principal }}</p>
            @endif
        </div>

        <hr class="rule">

        <div class="center doc-head">
            <span class="badge">TICKET</span>
            <p style="margin:6px 0 0;font-weight:700;">{{ $venta->numero }}</p>
            <p class="muted" style="margin:2px 0 0;">
                {{ optional($venta->fecha_pago ?? $venta->created_at)->timezone(config('app.timezone'))->format('d/m/Y H:i') }}
            </p>
        </div>

        <hr class="rule">

        <table class="meta">
            @if ($venta->cliente)
                <tr>
                    <td class="lbl">Cliente</td>
                    <td class="val">{{ $venta->cliente->nombreCompleto() }}</td>
                </tr>
                @if ($venta->cliente->numero_documento)
                    <tr>
                        <td class="lbl">Doc.</td>
                        <td class="val">{{ strtoupper((string) $venta->cliente->tipo_documento) }} {{ $venta->cliente->numero_documento }}</td>
                    </tr>
                @endif
            @endif
            @if ($venta->vehiculo)
                <tr>
                    <td class="lbl">Placa</td>
                    <td class="val">{{ $venta->vehiculo->placa }}</td>
                </tr>
            @endif
            @if ($venta->ordenTrabajo)
                <tr>
                    <td class="lbl">OT</td>
                    <td class="val">{{ $venta->ordenTrabajo->numero }}</td>
                </tr>
            @endif
            <tr>
                <td class="lbl">Pago</td>
                <td class="val">{{ strtoupper((string) $venta->metodo_pago) }}</td>
            </tr>
        </table>

        <hr class="rule">

        <table class="items">
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th class="qty">Cant</th>
                    <th class="pu">P.U.</th>
                    <th class="imp">Imp.</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($venta->lineas as $linea)
                    <tr>
                        <td>{{ $linea->descripcion }}</td>
                        <td class="qty">{{ rtrim(rtrim(number_format((float) $linea->cantidad, 3, '.', ''), '0'), '.') }}</td>
                        <td class="pu">{{ number_format((float) $linea->precio_unitario, 2) }}</td>
                        <td class="imp">{{ number_format((float) $linea->subtotal, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <hr class="rule">

        <table class="totales">
            <tr>
                <td class="lbl">Subtotal</td>
                <td class="val">{{ number_format((float) $venta->subtotal, 2) }}</td>
            </tr>
            <tr>
                <td class="lbl">IGV</td>
                <td class="val">{{ number_format((float) $venta->igv_monto, 2) }}</td>
            </tr>
            <tr class="grand">
                <td class="lbl">TOTAL {{ $venta->moneda }}</td>
                <td class="val">{{ number_format((float) $venta->total, 2) }}</td>
            </tr>
            @if ($venta->monto_recibido !== null)
                <tr>
                    <td class="lbl">Recibido</td>
                    <td class="val">{{ number_format((float) $venta->monto_recibido, 2) }}</td>
                </tr>
            @endif
            @if ($venta->vuelto !== null && (float) $venta->vuelto > 0)
                <tr>
                    <td class="lbl">Vuelto</td>
                    <td class="val">{{ number_format((float) $venta->vuelto, 2) }}</td>
                </tr>
            @endif
        </table>

        <hr class="rule">

        <p class="center muted" style="margin:0;">Documento interno · No es comprobante SUNAT</p>
        <p class="center muted" style="margin:4px 0 0;">¡Gracias por su preferencia!</p>
    </div>

    <script>
        window.addEventListener('load', function () {
            setTimeout(function () { window.print(); }, 350);
        });
    </script>
</body>
</html>
