import { Link } from '@inertiajs/react';
import {
    ArrowLeftRight,
    BarChart3,
    Building2,
    CalendarDays,
    Car,
    ClipboardList,
    Cog,
    CreditCard,
    FileText,
    Hash,
    History,
    Inbox,
    Landmark,
    LayoutGrid,
    Layers,
    ListChecks,
    Package,
    Receipt,
    Ruler,
    ScrollText,
    Settings2,
    ShieldCheck,
    ShoppingCart,
    Tags,
    Truck,
    UserCog,
    Users,
    Wallet,
    Warehouse,
    Wrench,
} from 'lucide-react';
import { useMemo } from 'react';
import AppLogo from '@/components/app-logo';
import { NavMainCollapsible } from '@/components/nav-main-collapsible';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import sesiones from '@/routes/caja/sesiones';
import ventas from '@/routes/caja/ventas';
import documentos from '@/routes/facturacion/documentos';
import seriesFacturacion from '@/routes/facturacion/series';
import financiero from '@/routes/reportes/financiero';
import ordenesReporte from '@/routes/reportes/ordenes';
import general from '@/routes/configuracion/general';
import sedes from '@/routes/configuracion/sedes';
import categoriasInventario from '@/routes/inventario/categorias';
import comprasInventario from '@/routes/inventario/compras';
import movimientosInventario from '@/routes/inventario/movimientos';
import productosInventario from '@/routes/inventario/productos';
import proveedoresInventario from '@/routes/inventario/proveedores';
import stockInventario from '@/routes/inventario/stock';
import planes from '@/routes/plataforma/planes';
import suscripciones from '@/routes/plataforma/suscripciones';
import tenants from '@/routes/plataforma/tenants';
import unidadesMedida from '@/routes/plataforma/unidades-medida';
import categoriasServicios from '@/routes/taller/categorias-servicios';
import citasTaller from '@/routes/taller/citas';
import clientes from '@/routes/taller/clientes';
import ordenesTrabajo from '@/routes/taller/ordenes-trabajo';
import presupuestos from '@/routes/taller/presupuestos';
import serviciosTaller from '@/routes/taller/servicios';
import vehiculos from '@/routes/taller/vehiculos';
import type { NavGroup, NavItem } from '@/types';

function useNavConfig(): { singles: NavItem[]; groups: NavGroup[] } {
    return useMemo(
        () => ({
            singles: [
                {
                    title: 'Dashboard',
                    href: dashboard(),
                    icon: LayoutGrid,
                    permission: 'dashboard.view',
                },
            ],
            groups: [
                {
                    title: 'Taller',
                    icon: Wrench,
                    context: 'tenant',
                    items: [
                        {
                            title: 'Clientes',
                            href: clientes.index(),
                            icon: Users,
                            permission: 'clientes.view',
                        },
                        {
                            title: 'Vehículos',
                            href: vehiculos.index(),
                            icon: Car,
                            permission: 'vehiculos.view',
                        },
                        {
                            title: 'Servicios',
                            href: serviciosTaller.index(),
                            icon: ListChecks,
                            permission: 'servicios.view',
                        },
                        {
                            title: 'Categorías de servicios',
                            href: categoriasServicios.index(),
                            icon: Tags,
                            permission: 'categorias-servicios.view',
                        },
                        {
                            title: 'Citas',
                            href: citasTaller.index(),
                            icon: CalendarDays,
                            permission: 'citas.view',
                        },
                        {
                            title: 'Órdenes de trabajo',
                            href: ordenesTrabajo.index(),
                            icon: ClipboardList,
                            permission: 'ordenes-trabajo.view',
                        },
                        {
                            title: 'Presupuestos',
                            href: presupuestos.index(),
                            icon: FileText,
                            permission: 'cotizaciones.view',
                        },
                    ],
                },
                {
                    title: 'Inventario',
                    icon: Package,
                    context: 'tenant',
                    items: [
                        {
                            title: 'Categorías',
                            href: categoriasInventario.index(),
                            icon: Tags,
                            permission: 'categorias-inventario.view',
                        },
                        {
                            title: 'Repuestos',
                            href: productosInventario.index(),
                            icon: Package,
                            permission: 'productos.view',
                        },
                        {
                            title: 'Proveedores',
                            href: proveedoresInventario.index(),
                            icon: Truck,
                            permission: 'proveedores.view',
                        },
                        {
                            title: 'Compras',
                            href: comprasInventario.index(),
                            icon: ShoppingCart,
                            permission: 'compras.view',
                        },
                        {
                            title: 'Stock',
                            href: stockInventario.index(),
                            icon: Warehouse,
                            permission: 'stock.view',
                        },
                        {
                            title: 'Movimientos',
                            href: movimientosInventario.index(),
                            icon: ArrowLeftRight,
                            permission: 'movimientos-stock.view',
                        },
                    ],
                },
                {
                    title: 'Caja',
                    icon: Wallet,
                    context: 'tenant',
                    items: [
                        {
                            title: 'Sesiones',
                            href: sesiones.index(),
                            icon: Landmark,
                            permission: 'caja-sesiones.view',
                        },
                        {
                            title: 'Ventas',
                            href: ventas.index(),
                            icon: Receipt,
                            permission: 'ventas.view',
                        },
                    ],
                },
                {
                    title: 'Facturación',
                    icon: ScrollText,
                    context: 'tenant',
                    items: [
                        {
                            title: 'Comprobantes',
                            href: documentos.index(),
                            icon: FileText,
                            permission: 'documentos.view',
                        },
                        {
                            title: 'Series',
                            href: seriesFacturacion.index(),
                            icon: Hash,
                            permission: 'series.view',
                        },
                    ],
                },
                {
                    title: 'Reportes',
                    icon: BarChart3,
                    context: 'tenant',
                    items: [
                        {
                            title: 'Caja y ventas',
                            href: financiero.index(),
                            icon: Wallet,
                            permission: 'reporte-financiero.view',
                        },
                        {
                            title: 'Órdenes',
                            href: ordenesReporte.index(),
                            icon: ClipboardList,
                            permission: 'reporte-ordenes.view',
                        },
                    ],
                },
                {
                    title: 'Comunicaciones',
                    icon: Inbox,
                    context: 'tenant',
                    items: [
                        {
                            title: 'Cola saliente',
                            href: '/comunicaciones/cola',
                            icon: Inbox,
                            permission: 'comunicaciones-cola.view',
                        },
                        {
                            title: 'Histórico',
                            href: '/comunicaciones/historico',
                            icon: History,
                            permission: 'comunicaciones-historico.view',
                        },
                    ],
                },
                {
                    title: 'Plataforma',
                    icon: Layers,
                    context: 'central',
                    items: [
                        {
                            title: 'Talleres',
                            href: tenants.index(),
                            icon: Building2,
                            permission: 'plataforma-tenants.view',
                        },
                        {
                            title: 'Planes',
                            href: planes.index(),
                            icon: Layers,
                            permission: 'plataforma-planes.view',
                        },
                        {
                            title: 'Unidades de medida',
                            href: unidadesMedida.index(),
                            icon: Ruler,
                            permission: 'plataforma-unidades-medida.view',
                        },
                        {
                            title: 'Suscripciones',
                            href: suscripciones.index(),
                            icon: CreditCard,
                            permission: 'plataforma-suscripciones.view',
                        },
                    ],
                },
                {
                    title: 'Configuración',
                    icon: Cog,
                    // Visible también en panel central (roles / usuarios de plataforma).
                    context: 'both',
                    items: [
                        {
                            title: 'General',
                            href: general.show(),
                            icon: Settings2,
                            permission: 'config-general.view',
                            context: 'tenant',
                        },
                        {
                            title: 'Sedes',
                            href: sedes.index(),
                            icon: Building2,
                            permission: 'sedes.view',
                            context: 'tenant',
                        },
                        {
                            title: 'Roles',
                            href: '/configuracion/roles',
                            icon: ShieldCheck,
                            permission: 'roles.view',
                        },
                        {
                            title: 'Usuarios',
                            href: '/configuracion/usuarios',
                            icon: UserCog,
                            permission: 'usuarios.view',
                        },
                    ],
                },
            ],
        }),
        [],
    );
}

export function AppSidebar() {
    const { singles, groups } = useNavConfig();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMainCollapsible
                    label="Menú"
                    singles={singles}
                    groups={groups}
                />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
