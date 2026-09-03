/**
 * Etiquetas humanas para el árbol de permisos (Configuración → Roles).
 * Si un módulo/acción no está aquí, se muestra el slug crudo.
 */

const MODULE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    clientes: 'Clientes',
    vehiculos: 'Vehículos',
    citas: 'Citas',
    'ordenes-trabajo': 'Órdenes de trabajo',
    cotizaciones: 'Cotizaciones',
    'checklist-inspeccion': 'Checklist de inspección',
    servicios: 'Servicios',
    'categorias-servicios': 'Categorías de servicios',
    productos: 'Productos',
    'categorias-inventario': 'Categorías inventario',
    stock: 'Stock',
    'movimientos-stock': 'Movimientos de stock',
    'alertas-stock': 'Alertas de stock',
    proveedores: 'Proveedores',
    compras: 'Compras',
    'caja-sesiones': 'Sesiones de caja',
    ventas: 'Ventas',
    pagos: 'Pagos',
    descuentos: 'Descuentos',
    documentos: 'Documentos',
    series: 'Series',
    'notas-baja': 'Notas de baja',
    'reporte-financiero': 'Reporte financiero',
    'reporte-ordenes': 'Reporte de órdenes',
    'config-general': 'Configuración general',
    sedes: 'Sedes',
    roles: 'Roles',
    usuarios: 'Usuarios',
    'auditoria-logs': 'Logs de auditoría',
    'auditoria-login-attempts': 'Intentos de acceso',
    'audit-trail': 'Trazabilidad',
    'plataforma-tenants': 'Talleres',
    'plataforma-planes': 'Planes',
    'plataforma-unidades-medida': 'Unidades de medida',
    'plataforma-suscripciones': 'Suscripciones',
    'plataforma-cobros': 'Cobros',
    'plataforma-operaciones': 'Operaciones',
    'platform-settings': 'Ajustes de plataforma',
};

const ACTION_LABELS: Record<string, string> = {
    view: 'Ver',
    create: 'Crear',
    update: 'Editar',
    delete: 'Eliminar',
    export: 'Exportar',
    'bulk-delete': 'Eliminación masiva',
    cancel: 'Cancelar',
    convert: 'Convertir en OT',
    cerrar: 'Cerrar',
    aprobar: 'Aprobar',
    adjust: 'Ajustar',
    open: 'Abrir',
    close: 'Cerrar sesión de caja',
    egreso: 'Registrar egreso',
    refund: 'Reembolsar',
    send: 'Enviar',
    'reset-password': 'Restablecer contraseña',
    suspend: 'Suspender',
    resume: 'Reanudar',
    impersonate: 'Impersonar',
    'extend-trial': 'Extender trial',
    'change-plan': 'Cambiar plan',
    renew: 'Renovar',
    'add-note': 'Agregar nota',
    'resend-invoice': 'Reenviar factura',
    manage: 'Administrar',
};

export function moduleLabel(module: string): string {
    return MODULE_LABELS[module] ?? module;
}

export function actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
}
