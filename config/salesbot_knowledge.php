<?php

/*
|--------------------------------------------------------------------------
| Conocimiento comercial para el Centro de Ventas de ORVAE
|--------------------------------------------------------------------------
|
| ORVAE lo lee firmado desde GET /api/internal/saas/salesbot-knowledge y su IA
| de ventas responde con esto. Los planes salen de la BD (PublicPlanCatalog).
| Para publicar una novedad, agrégala en "novedades" y despliega.
|
*/

return [

    'nombre' => 'TallerSaaS',

    'resumen' => 'Sistema en la nube para talleres mecánicos y car wash: órdenes de trabajo por placa, '
        .'presupuestos, lavado, inventario, caja con boleta y factura SUNAT, y avisos automáticos por WhatsApp. '
        .'Cada taller entra por su propio subdominio.',

    'publico' => 'Talleres mecánicos, centros de servicio automotriz, lubricentros y car wash en Perú.',

    'palabras_clave' => [
        'tallersaas', 'taller', 'taller mecánico', 'mecánico', 'mecánica', 'automotriz',
        'car wash', 'carwash', 'lavado de autos', 'lavadero', 'lubricentro', 'cambio de aceite',
        'orden de trabajo', 'placa', 'vehículo', 'vehículos', 'repuestos', 'aseguradora', 'siniestro',
    ],

    'modulos' => [
        ['titulo' => 'Órdenes de trabajo', 'contenido' => 'Recepción, diagnóstico, reparación y entrega. Todo por placa, con el historial del vehículo a mano.'],
        ['titulo' => 'Presupuestos', 'contenido' => 'El cliente ve el alcance y lo aprueba antes de empezar el trabajo.'],
        ['titulo' => 'Car wash', 'contenido' => 'Ticket de lavado, servicios y cobro en la misma caja del taller. No es otro programa.'],
        ['titulo' => 'Inventario', 'contenido' => 'El repuesto que entra a la orden sale del stock. Compras y proveedores.'],
        ['titulo' => 'Caja y SUNAT', 'contenido' => 'Turno de caja, venta, boleta y factura electrónica con series listas.'],
        ['titulo' => 'WhatsApp', 'contenido' => 'Aviso de cita 48 h y 2 h antes, auto listo, cambio de aceite y próxima revisión. Sin copiar números a mano.'],
        ['titulo' => 'Aseguradoras', 'contenido' => 'Siniestro, póliza e informe en el sistema, no en un chat suelto.'],
        ['titulo' => 'Portal por placa', 'contenido' => 'El cliente consulta el estado de su auto por su placa sin llamar al taller.'],
    ],

    'faq' => [
        ['titulo' => '¿Qué es TallerSaaS?', 'contenido' => 'Es el sistema del taller mecánico en la nube: órdenes, lavado, inventario, WhatsApp, caja y comprobantes SUNAT. Cada taller entra por su subdominio.'],
        ['titulo' => '¿Sirve si también lavo autos?', 'contenido' => 'Sí. Car wash abre su propio ticket y cobra en la misma caja del taller.'],
        ['titulo' => '¿Los recordatorios salen solos?', 'contenido' => 'Sí. La cita se avisa 48 horas antes y otra vez 2 horas antes. También sale el recordatorio de cambio de aceite y de la próxima revisión.'],
        ['titulo' => '¿Emite a SUNAT?', 'contenido' => 'Sí. Boleta desde el plan Básico. Factura y guías de remisión desde Pro. Los precios ya incluyen IGV.'],
        ['titulo' => '¿Cómo lo activo?', 'contenido' => 'Se elige el plan Gratis o uno de pago en orvae.pe/software/tallersaas, se confirma y se entra al subdominio del taller a crear la contraseña.'],
        ['titulo' => '¿Hay demo?', 'contenido' => 'Sí, hay demo pública con datos de ejemplo. Se reinicia cada noche a las 2:00.'],
        ['titulo' => '¿Todos los planes tienen todos los módulos?', 'contenido' => 'Sí. Todos los planes incluyen todos los módulos; cambian los límites (sedes, usuarios, clientes, vehículos) y los comprobantes SUNAT.'],
    ],

    'objeciones' => [
        ['titulo' => 'Quiero probar antes de pagar', 'contenido' => 'Ofrecer la demo pública y el plan Gratis, que no requiere pago y permite usar todos los módulos con límites menores.'],
        ['titulo' => 'Ya uso cuaderno o Excel', 'contenido' => 'Con TallerSaaS el historial queda por placa, el repuesto se descuenta solo del stock y los avisos de WhatsApp salen sin copiar números.'],
    ],

    /*
    | Novedades recientes (más nueva primero). fecha: YYYY-MM-DD.
    */
    'novedades' => [
        // ['titulo' => 'Portal por placa', 'contenido' => 'El cliente ya puede consultar su auto por placa.', 'fecha' => '2026-10-01'],
    ],

    'demo' => [
        'url' => env('SALESBOT_DEMO_URL', 'https://demo.tallersaas.orvae.pe'),
        'usuario' => env('SALESBOT_DEMO_EMAIL', 'demo@tallersaas.pe'),
        'password' => env('SALESBOT_DEMO_PASSWORD', 'demo1234'),
    ],

    'registro_url' => env('SALESBOT_REGISTER_URL', 'https://orvae.pe/software/tallersaas'),

];
