import { usePage } from '@inertiajs/react';
import type { TallerBranding } from '@/types/taller-branding';

/**
 * Branding del taller desde props compartidas (no se pisa por props de página).
 */
export function useTallerBranding(): TallerBranding | null {
    return (usePage().props.taller_branding as TallerBranding | null) ?? null;
}
