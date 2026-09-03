import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { usePermission } from '@/hooks/use-permission';
import { cn } from '@/lib/utils';
import type { NavContext, NavGroup, NavItem } from '@/types';

/**
 * ¿El item/grupo aplica al contexto actual?
 *
 * - `both` (o ausente) → siempre.
 * - `central` → solo en el dominio central (panel del superadmin).
 * - `tenant` → solo dentro de un subdominio de taller.
 */
function matchesContext(
    context: NavContext | undefined,
    hasTenant: boolean,
): boolean {
    if (!context || context === 'both') return true;
    if (context === 'tenant') return hasTenant;
    if (context === 'central') return !hasTenant;
    return true;
}

type NavMainCollapsibleProps = {
    /** Label discreta arriba del grupo (e.g. "Módulos"). */
    label?: string;
    /** Items que aparecen al inicio sin agrupar (e.g. Dashboard). */
    singles?: NavItem[];
    /** Grupos desplegables con sub-items. */
    groups: NavGroup[];
};

/**
 * Navegación principal del sidebar con grupos colapsables.
 *
 * El componente respeta el modo `collapsible="icon"` del sidebar — al
 * colapsar solo se ven los iconos de los grupos (los sub-items se ocultan).
 * Filtra items/grupos según permisos Spatie del usuario y el contexto
 * (panel central vs. taller).
 */
export function NavMainCollapsible({
    label,
    singles = [],
    groups,
}: NavMainCollapsibleProps) {
    const { isCurrentOrParentUrl, isNavItemActive, currentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();
    const { can, permissions } = usePermission();
    const page = usePage();
    const tenant = page.props.tenant;
    const hasTenant = tenant !== null && tenant !== undefined;

    const itemVisible = (item: NavItem): boolean => {
        if (!matchesContext(item.context, hasTenant)) {
            return false;
        }

        return !item.permission || can(item.permission);
    };

    const closeMobileSidebar = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const visibleSingles = useMemo(
        () => singles.filter(itemVisible),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [singles, hasTenant, permissions],
    );

    const visibleGroups = useMemo(() => {
        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    itemVisible({
                        ...item,
                        context: item.context ?? group.context,
                    }),
                ),
            }))
            .filter((group) => {
                if (group.permission && !can(group.permission)) return false;
                if (!matchesContext(group.context, hasTenant)) {
                    return false;
                }
                return group.items.length > 0;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups, hasTenant, permissions]);

    const initialOpenMap = useMemo(() => {
        const map: Record<string, boolean> = {};
        for (const group of visibleGroups) {
            const hasActiveChild = group.items.some((item) =>
                isCurrentOrParentUrl(item.href),
            );
            map[group.title] = hasActiveChild || group.defaultOpen === true;
        }
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUrl, visibleGroups]);

    if (visibleSingles.length === 0 && visibleGroups.length === 0) {
        return null;
    }

    return (
        <SidebarGroup className="px-2 py-0">
            {label && (
                <SidebarGroupLabel className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    {label}
                </SidebarGroupLabel>
            )}

            <SidebarMenu>
                {visibleSingles.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentOrParentUrl(item.href)}
                            tooltip={{ children: item.title }}
                            className="font-medium transition-all data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                        >
                            <Link href={item.href} onClick={closeMobileSidebar}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}

                {visibleGroups.map((group) => (
                    <Collapsible
                        key={group.title}
                        asChild
                        defaultOpen={initialOpenMap[group.title]}
                        className="group/collapsible"
                    >
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    tooltip={{ children: group.title }}
                                    className="group/trigger cursor-pointer font-medium transition-all hover:bg-primary/8"
                                >
                                    {group.icon && (
                                        <group.icon className="transition-colors group-data-[state=open]/collapsible:text-primary" />
                                    )}
                                    <span className="transition-colors group-data-[state=open]/collapsible:text-foreground">
                                        {group.title}
                                    </span>
                                    <ChevronRight className="ml-auto size-4 text-muted-foreground transition-all duration-300 group-data-[state=open]/collapsible:rotate-90 group-data-[state=open]/collapsible:text-primary" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                <SidebarMenuSub className="mt-1 gap-0.5 border-sidebar-border/50">
                                    {group.items.map((item, index) => (
                                        <NavSubItem
                                            key={item.title}
                                            item={item}
                                            active={isNavItemActive(
                                                item.href,
                                                group.items.map((i) => i.href),
                                            )}
                                            index={index}
                                            onNavigate={closeMobileSidebar}
                                        />
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

type NavSubItemProps = {
    item: NavItem;
    active: boolean;
    /** Posición dentro del grupo, usada para stagger animation. */
    index: number;
    /** Callback al hacer click — útil para cerrar sidebar en móvil. */
    onNavigate?: () => void;
};

/**
 * Sub-item individual del menú desplegable.
 * Lleva su propia animación de entrada (stagger por índice).
 */
function NavSubItem({ item, active, index, onNavigate }: NavSubItemProps) {
    return (
        <SidebarMenuSubItem
            style={{ animationDelay: `${index * 30}ms` }}
            className="animate-in fade-in slide-in-from-left-2 fill-mode-both duration-300"
        >
            <Link
                href={item.href}
                onClick={onNavigate}
                data-active={active}
                className={cn(
                    'group/sub relative flex h-9 items-center gap-2.5 overflow-hidden rounded-md pr-2 pl-3 text-sm transition-all duration-200 outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                    active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-sidebar-foreground/85 hover:translate-x-0.5 hover:bg-primary/8 hover:text-foreground',
                )}
            >
                {/* Barra vertical brand cuando está activo */}
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute top-1.5 bottom-1.5 left-0 w-[2.5px] rounded-r-full bg-primary transition-all duration-200',
                        active
                            ? 'translate-x-0 opacity-100'
                            : '-translate-x-1 opacity-0',
                    )}
                />

                {item.icon && (
                    <item.icon
                        strokeWidth={2.25}
                        className={cn(
                            'size-4 shrink-0 transition-colors duration-200',
                            active
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover/sub:text-primary',
                        )}
                    />
                )}

                <span className="min-w-0 flex-1 truncate">{item.title}</span>
            </Link>
        </SidebarMenuSubItem>
    );
}
