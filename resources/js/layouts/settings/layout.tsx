import { Link } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { useState, type PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useSidebar } from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Perfil',
        href: edit(),
        icon: null,
    },
    {
        title: 'Seguridad',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Apariencia',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();
    const [sectionsOpen, setSectionsOpen] = useState(false);

    const closeMobileSidebar = () => {
        setSectionsOpen(false);

        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const nav = (keyPrefix: string) => (
        <nav className="flex flex-col space-y-1" aria-label="Configuración">
            {sidebarNavItems.map((item, index) => (
                <Button
                    key={`${keyPrefix}-${toUrl(item.href)}-${index}`}
                    size="sm"
                    variant="ghost"
                    asChild
                    className={cn('w-full justify-start', {
                        'bg-muted': isCurrentOrParentUrl(item.href),
                    })}
                >
                    <Link href={item.href} onClick={closeMobileSidebar}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {item.title}
                    </Link>
                </Button>
            ))}
        </nav>
    );

    const activeItem = sidebarNavItems.find((item) =>
        isCurrentOrParentUrl(item.href),
    );

    return (
        <div className="px-4 py-6">
            <Heading
                title="Configuración"
                description="Administra tu perfil y los datos de la cuenta"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <div className="mb-4 lg:hidden">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-2"
                        onClick={() => setSectionsOpen(true)}
                    >
                        <Menu className="size-4" />
                        {activeItem?.title ?? 'Secciones'}
                    </Button>
                    <Sheet open={sectionsOpen} onOpenChange={setSectionsOpen}>
                        <SheetContent side="left" className="w-72">
                            <SheetHeader>
                                <SheetTitle>Configuración</SheetTitle>
                            </SheetHeader>
                            {nav('sheet')}
                        </SheetContent>
                    </Sheet>
                </div>

                <aside className="hidden w-48 lg:block">{nav('aside')}</aside>

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
