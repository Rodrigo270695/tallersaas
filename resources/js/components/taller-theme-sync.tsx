import { router } from '@inertiajs/react';
import { useLayoutEffect } from 'react';
import { applyTallerBrandTheme, clearTallerBrandTheme } from '@/lib/taller-theme';
import type { TallerBranding } from '@/types/taller-branding';

type InertiaPage = { props?: Record<string, unknown> };
type InertiaEvent = CustomEvent<{ page?: InertiaPage }>;

function syncBranding(props: Record<string, unknown> | undefined): void {
    const branding = props?.taller_branding as TallerBranding | null | undefined;

    if (!branding) {
        clearTallerBrandTheme();

        return;
    }

    applyTallerBrandTheme(branding.color_primario, branding.color_secundario);
}

function readRouterPageProps(): Record<string, unknown> | undefined {
    return (router as unknown as { page?: InertiaPage }).page?.props;
}

/**
 * Mantiene las variables CSS de marca al día en navegaciones Inertia.
 * La carga inicial también se cubre en servidor (Blade) y en app.tsx.
 */
export function TallerThemeSync() {
    useLayoutEffect(() => {
        syncBranding(readRouterPageProps());

        const removeSuccess = router.on('success', (event) => {
            const detail = (event as InertiaEvent).detail;
            syncBranding(detail?.page?.props);
        });

        return () => {
            removeSuccess();
        };
    }, []);

    return null;
}
