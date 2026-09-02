import { applyTallerBrandTheme } from '@/lib/taller-theme';
import type { TallerBranding } from '@/types/taller-branding';

/**
 * Aplica el tema del taller leyendo `data-page` de Inertia antes del
 * primer render de React (evita flash de colores por defecto).
 */
export function applyInitialTallerThemeFromDocument(): void {
    if (typeof document === 'undefined') {
        return;
    }

    const appRoot = document.getElementById('app');
    const rawPage = appRoot?.getAttribute('data-page');

    if (!rawPage) {
        return;
    }

    try {
        const page = JSON.parse(rawPage) as { props?: Record<string, unknown> };
        const branding = page.props?.taller_branding as TallerBranding | null | undefined;

        if (!branding) {
            return;
        }

        applyTallerBrandTheme(branding.color_primario, branding.color_secundario);
    } catch {
        // JSON inválido: Inertia aplicará el tema en la primera navegación.
    }
}
