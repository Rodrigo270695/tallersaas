import { createInertiaApp } from '@inertiajs/react';
import { TallerThemeSync } from '@/components/taller-theme-sync';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import GuestLayout from '@/layouts/guest-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { applyInitialTallerThemeFromDocument } from '@/lib/apply-initial-taller-theme';

const appName = import.meta.env.VITE_APP_NAME || 'TallerSaaS';

// Evita el flash de colores por defecto: lee el branding del taller
// directamente del `data-page` de Inertia antes del primer render.
applyInitialTallerThemeFromDocument();

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('public/'):
                return GuestLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <TallerThemeSync />
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                // Fuerza a revisar si hay una versión nueva del SW.
                void registration.update();
            })
            .catch(() => {
                /* sin service worker la app sigue funcionando con normalidad */
            });
    });
}
