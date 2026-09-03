<?php

use App\Http\Controllers\CajaEgresoController;
use App\Http\Controllers\CajaSesionController;
use App\Http\Controllers\CategoriaInventarioController;
use App\Http\Controllers\CategoriaServicioController;
use App\Http\Controllers\CitaController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FelDocumentController;
use App\Http\Controllers\FelSerieController;
use App\Http\Controllers\GeoController;
use App\Http\Controllers\MarcaController;
use App\Http\Controllers\ModeloController;
use App\Http\Controllers\MovimientoInventarioController;
use App\Http\Controllers\NotificationQueueController;
use App\Http\Controllers\OrdenTrabajoController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PresupuestoController;
use App\Http\Controllers\PresupuestoPublicController;
use App\Http\Controllers\ProductoInventarioController;
use App\Http\Controllers\ReporteFinancieroController;
use App\Http\Controllers\ReporteOrdenesController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SedeController;
use App\Http\Controllers\ServicioController;
use App\Http\Controllers\StockInventarioController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TallerSettingController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\TenantImpersonationController;
use App\Http\Controllers\TenantWhatsAppController;
use App\Http\Controllers\UnidadMedidaController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehiculoController;
use App\Http\Controllers\VentaController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::redirect('/manifest.webmanifest', '/manifest.json', 301);

Route::middleware('tenant')
    ->group(function (): void {
        Route::get('p/{token}', [PresupuestoPublicController::class, 'show'])
            ->name('presupuesto.public');
        Route::post('p/{token}/aprobar', [PresupuestoPublicController::class, 'aprobar'])
            ->name('presupuesto.public.aprobar');
        Route::post('p/{token}/rechazar', [PresupuestoPublicController::class, 'rechazar'])
            ->name('presupuesto.public.rechazar');
    });

/*
|--------------------------------------------------------------------------
| Rutas centrales — TallerSaaS no tiene landing pública
|--------------------------------------------------------------------------
|
| Este mismo archivo se registra para CUALQUIER host (dominio central
| `tallersaas.orvae.pe` / `tallersaas.test` y también los subdominios de
| tenant, ya que `routes/tenant.php` solo se usa para lo que sea
| EXCLUSIVO de un subdominio). No existe "welcome": todo visitante no
| autenticado siempre termina en el login, tanto en el panel del
| superadmin como en el de cualquier taller.
|
*/

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

// `tenant.match-user` valida que, si el host resolvió un tenant, el
// usuario autenticado pertenezca a ese taller (o sea el superadmin
// central si el host es el dominio central). Así el MISMO nombre de
// ruta `dashboard` sirve para el panel central y para cada taller sin
// duplicar rutas ni middlewares.
Route::middleware(['auth', 'verified', 'tenant.match-user'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

// Módulos operativos del taller (clientes, vehículos, órdenes de trabajo…).
// Solo tienen sentido dentro del subdominio de un tenant, de ahí
// `tenant.required`. Cada acción exige el permiso Spatie correspondiente
// (ver `PermissionsSeeder`).
Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.required'])
    ->prefix('taller')
    ->name('taller.')
    ->group(function () {
        Route::middleware(['permission:clientes.create|clientes.update', 'throttle:20,1'])
            ->get('clientes/consulta-dni', [ClienteController::class, 'consultaDni'])
            ->name('clientes.consulta-dni');
        Route::middleware(['permission:clientes.create|clientes.update', 'throttle:20,1'])
            ->get('clientes/consulta-ruc', [ClienteController::class, 'consultaRuc'])
            ->name('clientes.consulta-ruc');
        Route::middleware('permission:clientes.view')
            ->get('clientes', [ClienteController::class, 'index'])
            ->name('clientes.index');
        Route::middleware('permission:clientes.create')
            ->post('clientes', [ClienteController::class, 'store'])
            ->name('clientes.store');
        Route::middleware('permission:clientes.update')
            ->match(['put', 'patch'], 'clientes/{cliente}', [ClienteController::class, 'update'])
            ->name('clientes.update');
        Route::middleware('permission:clientes.delete')
            ->delete('clientes/{cliente}', [ClienteController::class, 'destroy'])
            ->name('clientes.destroy');
        Route::middleware('permission:clientes.bulk-delete')
            ->delete('clientes-bulk', [ClienteController::class, 'bulkDestroy'])
            ->name('clientes.bulk-destroy');

        Route::middleware('permission:vehiculos.view')
            ->get('vehiculos', [VehiculoController::class, 'index'])
            ->name('vehiculos.index');
        Route::middleware('permission:vehiculos.create')
            ->post('vehiculos', [VehiculoController::class, 'store'])
            ->name('vehiculos.store');
        Route::middleware('permission:vehiculos.update')
            ->match(['put', 'patch'], 'vehiculos/{vehiculo}', [VehiculoController::class, 'update'])
            ->name('vehiculos.update');
        Route::middleware('permission:vehiculos.delete')
            ->delete('vehiculos/{vehiculo}', [VehiculoController::class, 'destroy'])
            ->name('vehiculos.destroy');
        Route::middleware('permission:vehiculos.bulk-delete')
            ->delete('vehiculos-bulk', [VehiculoController::class, 'bulkDestroy'])
            ->name('vehiculos.bulk-destroy');

        // Alta rápida de marca/modelo desde el combobox creable del
        // formulario de vehículos (mismo permiso que crear/editar vehículo).
        Route::middleware('permission:vehiculos.create|vehiculos.update')
            ->post('marcas', [MarcaController::class, 'store'])
            ->name('marcas.store');
        Route::middleware('permission:vehiculos.create|vehiculos.update')
            ->post('modelos', [ModeloController::class, 'store'])
            ->name('modelos.store');

        Route::middleware('permission:categorias-servicios.view')
            ->get('categorias-servicios', [CategoriaServicioController::class, 'index'])
            ->name('categorias-servicios.index');
        Route::middleware('permission:categorias-servicios.create')
            ->post('categorias-servicios', [CategoriaServicioController::class, 'store'])
            ->name('categorias-servicios.store');
        Route::middleware('permission:categorias-servicios.update')
            ->match(['put', 'patch'], 'categorias-servicios/{categoria_servicio}', [CategoriaServicioController::class, 'update'])
            ->name('categorias-servicios.update');
        Route::middleware('permission:categorias-servicios.delete')
            ->delete('categorias-servicios/{categoria_servicio}', [CategoriaServicioController::class, 'destroy'])
            ->name('categorias-servicios.destroy');

        Route::middleware('permission:servicios.view')
            ->get('servicios', [ServicioController::class, 'index'])
            ->name('servicios.index');
        Route::middleware('permission:servicios.create')
            ->post('servicios', [ServicioController::class, 'store'])
            ->name('servicios.store');
        Route::middleware('permission:servicios.update')
            ->match(['put', 'patch'], 'servicios/{servicio}', [ServicioController::class, 'update'])
            ->name('servicios.update');
        Route::middleware('permission:servicios.delete')
            ->delete('servicios/{servicio}', [ServicioController::class, 'destroy'])
            ->name('servicios.destroy');

        Route::middleware('permission:citas.view')
            ->get('citas', [CitaController::class, 'index'])
            ->name('citas.index');
        Route::middleware('permission:citas.create')
            ->post('citas', [CitaController::class, 'store'])
            ->name('citas.store');
        Route::middleware('permission:citas.update')
            ->match(['put', 'patch'], 'citas/{cita}', [CitaController::class, 'update'])
            ->name('citas.update');
        Route::middleware('permission:citas.delete')
            ->delete('citas/{cita}', [CitaController::class, 'destroy'])
            ->name('citas.destroy');
        Route::middleware('permission:citas.convert')
            ->post('citas/{cita}/convertir', [CitaController::class, 'convertir'])
            ->name('citas.convertir');

        Route::middleware('permission:ordenes-trabajo.view')
            ->get('ordenes-trabajo', [OrdenTrabajoController::class, 'index'])
            ->name('ordenes-trabajo.index');
        Route::middleware('permission:ordenes-trabajo.create')
            ->post('ordenes-trabajo', [OrdenTrabajoController::class, 'store'])
            ->name('ordenes-trabajo.store');
        Route::middleware('permission:ordenes-trabajo.update')
            ->match(['put', 'patch'], 'ordenes-trabajo/{orden_trabajo}', [OrdenTrabajoController::class, 'update'])
            ->name('ordenes-trabajo.update');
        Route::middleware('permission:ordenes-trabajo.update')
            ->post('ordenes-trabajo/{orden_trabajo}/avisar-lista', [OrdenTrabajoController::class, 'avisarLista'])
            ->name('ordenes-trabajo.avisar-lista');
        Route::middleware('permission:ordenes-trabajo.delete')
            ->delete('ordenes-trabajo/{orden_trabajo}', [OrdenTrabajoController::class, 'destroy'])
            ->name('ordenes-trabajo.destroy');
        Route::middleware('permission:ordenes-trabajo.delete')
            ->delete('ordenes-trabajo-bulk', [OrdenTrabajoController::class, 'bulkDestroy'])
            ->name('ordenes-trabajo.bulk-destroy');
        Route::middleware('permission:ventas.create')
            ->post('ordenes-trabajo/{orden_trabajo}/cobrar', [OrdenTrabajoController::class, 'cobrar'])
            ->name('ordenes-trabajo.cobrar');

        Route::middleware('permission:cotizaciones.view')
            ->get('presupuestos', [PresupuestoController::class, 'index'])
            ->name('presupuestos.index');
        Route::middleware('permission:cotizaciones.create')
            ->post('presupuestos', [PresupuestoController::class, 'store'])
            ->name('presupuestos.store');
        Route::middleware('permission:cotizaciones.update')
            ->match(['put', 'patch'], 'presupuestos/{presupuesto}', [PresupuestoController::class, 'update'])
            ->name('presupuestos.update');
        Route::middleware('permission:cotizaciones.delete')
            ->delete('presupuestos/{presupuesto}', [PresupuestoController::class, 'destroy'])
            ->name('presupuestos.destroy');
        Route::middleware('permission:cotizaciones.create')
            ->post('presupuestos/{presupuesto}/enviar', [PresupuestoController::class, 'enviar'])
            ->name('presupuestos.enviar');
        Route::middleware('permission:cotizaciones.aprobar')
            ->post('presupuestos/{presupuesto}/aprobar', [PresupuestoController::class, 'aprobar'])
            ->name('presupuestos.aprobar');
        Route::middleware('permission:cotizaciones.aprobar')
            ->post('presupuestos/{presupuesto}/rechazar', [PresupuestoController::class, 'rechazar'])
            ->name('presupuestos.rechazar');
        Route::middleware('permission:cotizaciones.aprobar')
            ->post('presupuestos/{presupuesto}/aplicar', [PresupuestoController::class, 'aplicar'])
            ->name('presupuestos.aplicar');
        Route::middleware('permission:cotizaciones.create')
            ->post('ordenes-trabajo/{orden_trabajo}/presupuesto', [PresupuestoController::class, 'desdeOrden'])
            ->name('ordenes-trabajo.presupuesto');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.required'])
    ->prefix('caja')
    ->name('caja.')
    ->group(function () {
        Route::middleware('permission:caja-sesiones.view')
            ->get('sesiones', [CajaSesionController::class, 'index'])
            ->name('sesiones.index');
        Route::middleware('permission:caja-sesiones.open')
            ->post('sesiones', [CajaSesionController::class, 'store'])
            ->name('sesiones.store');
        Route::middleware('permission:caja-sesiones.close')
            ->post('sesiones/{caja_sesion}/cerrar', [CajaSesionController::class, 'cerrar'])
            ->name('sesiones.cerrar');
        Route::middleware('permission:caja-sesiones.egreso')
            ->post('sesiones/{caja_sesion}/egresos', [CajaEgresoController::class, 'store'])
            ->whereUuid('caja_sesion')
            ->name('sesiones.egresos.store');
        Route::middleware('permission:caja-sesiones.egreso')
            ->delete('sesiones/{caja_sesion}/egresos/{egreso}', [CajaEgresoController::class, 'destroy'])
            ->whereUuid(['caja_sesion', 'egreso'])
            ->name('sesiones.egresos.destroy');

        Route::middleware('permission:ventas.view')
            ->get('ventas', [VentaController::class, 'index'])
            ->name('ventas.index');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.required'])
    ->prefix('facturacion')
    ->name('facturacion.')
    ->group(function () {
        Route::middleware('permission:documentos.view')
            ->get('documentos', [FelDocumentController::class, 'index'])
            ->name('documentos.index');
        Route::middleware('permission:documentos.create')
            ->post('documentos/{venta}/emitir', [FelDocumentController::class, 'emitir'])
            ->whereUuid('venta')
            ->name('documentos.emitir');

        Route::middleware('permission:series.view')
            ->get('series', [FelSerieController::class, 'index'])
            ->name('series.index');
        Route::middleware('permission:series.create')
            ->post('series', [FelSerieController::class, 'store'])
            ->name('series.store');
        Route::middleware('permission:series.update')
            ->patch('series/{fel_serie}', [FelSerieController::class, 'update'])
            ->whereUuid('fel_serie')
            ->name('series.update');
        Route::middleware('permission:series.delete')
            ->delete('series/{fel_serie}', [FelSerieController::class, 'destroy'])
            ->whereUuid('fel_serie')
            ->name('series.destroy');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.required'])
    ->prefix('reportes')
    ->name('reportes.')
    ->group(function () {
        Route::middleware('permission:reporte-financiero.view')
            ->get('financiero', [ReporteFinancieroController::class, 'index'])
            ->name('financiero.index');
        Route::middleware('permission:reporte-ordenes.view')
            ->get('ordenes', [ReporteOrdenesController::class, 'index'])
            ->name('ordenes.index');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.required'])
    ->prefix('comunicaciones')
    ->name('comunicaciones.')
    ->group(function () {
        Route::middleware('permission:comunicaciones-cola.view')
            ->get('cola', [NotificationQueueController::class, 'cola'])
            ->name('cola');
        Route::middleware('permission:comunicaciones-historico.view')
            ->get('historico', [NotificationQueueController::class, 'historico'])
            ->name('historico');
        Route::middleware('permission:comunicaciones-cola.manage')
            ->post('cola/{notification}/cancel', [NotificationQueueController::class, 'cancel'])
            ->name('cola.cancel');
        Route::middleware('permission:comunicaciones-cola.manage')
            ->post('cola/{notification}/retry', [NotificationQueueController::class, 'retry'])
            ->name('cola.retry');
        Route::middleware('permission:comunicaciones-cola.manage')
            ->post('whatsapp/sync', [TenantWhatsAppController::class, 'sync'])
            ->name('whatsapp.sync');
        Route::middleware('permission:comunicaciones-cola.manage')
            ->get('whatsapp/qr', [TenantWhatsAppController::class, 'qr'])
            ->name('whatsapp.qr');
        Route::middleware('permission:comunicaciones-cola.manage')
            ->post('whatsapp/logout', [TenantWhatsAppController::class, 'logout'])
            ->name('whatsapp.logout');
        Route::middleware('permission:comunicaciones-cola.manage')
            ->post('whatsapp/test', [TenantWhatsAppController::class, 'sendTest'])
            ->name('whatsapp.test');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.required'])
    ->prefix('inventario')
    ->name('inventario.')
    ->group(function () {
        Route::middleware('permission:categorias-inventario.view')
            ->get('categorias', [CategoriaInventarioController::class, 'index'])
            ->name('categorias.index');
        Route::middleware('permission:categorias-inventario.create')
            ->post('categorias', [CategoriaInventarioController::class, 'store'])
            ->name('categorias.store');
        Route::middleware('permission:categorias-inventario.update')
            ->match(['put', 'patch'], 'categorias/{categoria}', [CategoriaInventarioController::class, 'update'])
            ->name('categorias.update');
        Route::middleware('permission:categorias-inventario.delete')
            ->delete('categorias/{categoria}', [CategoriaInventarioController::class, 'destroy'])
            ->name('categorias.destroy');

        Route::middleware('permission:productos.view')
            ->get('productos', [ProductoInventarioController::class, 'index'])
            ->name('productos.index');
        Route::middleware('permission:productos.create')
            ->post('productos', [ProductoInventarioController::class, 'store'])
            ->name('productos.store');
        Route::middleware('permission:productos.update')
            ->match(['put', 'patch'], 'productos/{producto}', [ProductoInventarioController::class, 'update'])
            ->name('productos.update');
        Route::middleware('permission:productos.delete')
            ->delete('productos/{producto}', [ProductoInventarioController::class, 'destroy'])
            ->name('productos.destroy');

        Route::middleware('permission:stock.view')
            ->get('stock', [StockInventarioController::class, 'index'])
            ->name('stock.index');
        Route::middleware('permission:stock.adjust')
            ->patch('stock', [StockInventarioController::class, 'adjust'])
            ->name('stock.adjust');

        Route::middleware('permission:movimientos-stock.view')
            ->get('movimientos', [MovimientoInventarioController::class, 'index'])
            ->name('movimientos.index');
        Route::middleware('permission:movimientos-stock.create')
            ->post('movimientos', [MovimientoInventarioController::class, 'store'])
            ->name('movimientos.store');
    });

// Catálogo geográfico (departamento → provincia → distrito).
Route::middleware(['auth', 'verified'])
    ->prefix('geo')
    ->name('geo.')
    ->group(function () {
        Route::get('departamentos', [GeoController::class, 'departamentos'])->name('departamentos');
        Route::get('provincias', [GeoController::class, 'provincias'])->name('provincias');
        Route::get('distritos', [GeoController::class, 'distritos'])->name('distritos');
    });

// Configuración (roles / usuarios): mismas URLs en el subdominio del
// taller y en el panel central. El alcance lo decide TallerAdminScope
// según `tenant_id()` (roles del tenant vs roles de plataforma).
Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.required'])
    ->prefix('configuracion')
    ->name('configuracion.')
    ->group(function () {
        Route::middleware('permission:config-general.view')
            ->get('general', [TallerSettingController::class, 'show'])
            ->name('general.show');
        Route::middleware('permission:config-general.update')
            ->match(['put', 'patch', 'post'], 'general', [TallerSettingController::class, 'update'])
            ->name('general.update');

        Route::middleware('permission:sedes.view')
            ->get('sedes', [SedeController::class, 'index'])
            ->name('sedes.index');
        Route::middleware('permission:sedes.create')
            ->post('sedes', [SedeController::class, 'store'])
            ->name('sedes.store');
        Route::middleware('permission:sedes.update')
            ->match(['put', 'patch'], 'sedes/{sede}', [SedeController::class, 'update'])
            ->name('sedes.update');
        Route::middleware('permission:sedes.delete')
            ->delete('sedes/{sede}', [SedeController::class, 'destroy'])
            ->name('sedes.destroy');
        Route::middleware('permission:sedes.bulk-delete')
            ->delete('sedes-bulk', [SedeController::class, 'bulkDestroy'])
            ->name('sedes.bulk-destroy');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user'])
    ->prefix('configuracion')
    ->name('configuracion.')
    ->group(function () {
        Route::middleware('permission:roles.view')
            ->get('roles', [RoleController::class, 'index'])
            ->name('roles.index');
        Route::middleware('permission:roles.create')
            ->post('roles', [RoleController::class, 'store'])
            ->name('roles.store');
        Route::middleware('permission:roles.bulk-delete')
            ->delete('roles/bulk', [RoleController::class, 'bulkDestroy'])
            ->name('roles.bulk-destroy');
        Route::middleware('permission:roles.update')
            ->put('roles/{role}/permissions', [RoleController::class, 'updatePermissions'])
            ->name('roles.update-permissions');
        Route::middleware('permission:roles.update')
            ->match(['put', 'patch'], 'roles/{role}', [RoleController::class, 'update'])
            ->name('roles.update');
        Route::middleware('permission:roles.delete')
            ->delete('roles/{role}', [RoleController::class, 'destroy'])
            ->name('roles.destroy');

        Route::middleware('permission:usuarios.view')
            ->get('usuarios', [UserController::class, 'index'])
            ->name('usuarios.index');
        Route::middleware('permission:usuarios.create')
            ->post('usuarios', [UserController::class, 'store'])
            ->name('usuarios.store');
        Route::middleware('permission:usuarios.bulk-delete')
            ->delete('usuarios/bulk', [UserController::class, 'bulkDestroy'])
            ->name('usuarios.bulk-destroy');
        Route::middleware('permission:usuarios.update')
            ->match(['put', 'patch'], 'usuarios/{user}', [UserController::class, 'update'])
            ->name('usuarios.update');
        Route::middleware('permission:usuarios.delete')
            ->delete('usuarios/{user}', [UserController::class, 'destroy'])
            ->name('usuarios.destroy');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user', 'tenant.none'])
    ->prefix('plataforma')
    ->name('plataforma.')
    ->group(function () {
        Route::middleware('permission:plataforma-tenants.view')
            ->get('tenants', [TenantController::class, 'index'])
            ->name('tenants.index');
        Route::middleware('permission:plataforma-tenants.create')
            ->post('tenants', [TenantController::class, 'store'])
            ->name('tenants.store');
        Route::middleware('permission:plataforma-tenants.update')
            ->match(['put', 'patch'], 'tenants/{tenant}', [TenantController::class, 'update'])
            ->name('tenants.update');
        Route::middleware('permission:plataforma-tenants.suspend')
            ->post('tenants/{tenant}/suspend', [TenantController::class, 'suspend'])
            ->name('tenants.suspend');
        Route::middleware('permission:plataforma-tenants.resume')
            ->post('tenants/{tenant}/resume', [TenantController::class, 'resume'])
            ->name('tenants.resume');
        Route::middleware('permission:plataforma-tenants.impersonate')
            ->post('tenants/{tenant}/impersonate', [TenantImpersonationController::class, 'start'])
            ->name('tenants.impersonate');

        Route::middleware('permission:plataforma-planes.view')
            ->get('planes', [PlanController::class, 'index'])
            ->name('planes.index');
        Route::middleware('permission:plataforma-planes.create')
            ->post('planes', [PlanController::class, 'store'])
            ->name('planes.store');
        Route::middleware('permission:plataforma-planes.update')
            ->match(['put', 'patch'], 'planes/{plan}', [PlanController::class, 'update'])
            ->name('planes.update');
        Route::middleware('permission:plataforma-planes.update')
            ->put('planes/{plan}/features', [PlanController::class, 'updateFeatures'])
            ->name('planes.update-features');
        Route::middleware('permission:plataforma-planes.delete')
            ->delete('planes/{plan}', [PlanController::class, 'destroy'])
            ->name('planes.destroy');

        Route::middleware('permission:plataforma-unidades-medida.view')
            ->get('unidades-medida', [UnidadMedidaController::class, 'index'])
            ->name('unidades-medida.index');
        Route::middleware('permission:plataforma-unidades-medida.create')
            ->post('unidades-medida', [UnidadMedidaController::class, 'store'])
            ->name('unidades-medida.store');
        Route::middleware('permission:plataforma-unidades-medida.update')
            ->match(['put', 'patch'], 'unidades-medida/{unidadMedida}', [UnidadMedidaController::class, 'update'])
            ->name('unidades-medida.update');
        Route::middleware('permission:plataforma-unidades-medida.delete')
            ->delete('unidades-medida/{unidadMedida}', [UnidadMedidaController::class, 'destroy'])
            ->name('unidades-medida.destroy');

        Route::middleware('permission:plataforma-suscripciones.view')
            ->get('suscripciones', [SubscriptionController::class, 'index'])
            ->name('suscripciones.index');
    });

Route::middleware(['auth', 'verified', 'tenant.match-user'])
    ->post('impersonate/leave', [TenantImpersonationController::class, 'leave'])
    ->name('impersonate.leave');

require __DIR__.'/settings.php';
