import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { TenantImpersonationBanner } from '@/components/tenant-impersonation-banner';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="h-svh max-h-svh min-h-0 overflow-hidden md:my-2 md:mr-2 md:ml-0 md:h-[calc(100svh-(--spacing(4)))] md:max-h-[calc(100svh-(--spacing(4)))] md:rounded-2xl md:border md:border-border md:bg-background md:shadow-sm"
            >
                <TenantImpersonationBanner />
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
