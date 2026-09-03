export type TicketAnchoMm = '56' | '58' | '80';

export const TICKET_ANCHO_OPTIONS: readonly TicketAnchoMm[] = ['56', '58', '80'];

export function normalizeTicketAncho(
    value: string | number | null | undefined,
    fallback: TicketAnchoMm = '80',
): TicketAnchoMm {
    const raw = value == null ? '' : String(value);

    if (raw === '56' || raw === '58' || raw === '80') {
        return raw;
    }

    return fallback;
}

export function resolveTicketAncho(configDefault: TicketAnchoMm): TicketAnchoMm {
    return normalizeTicketAncho(configDefault);
}

export function buildTicketPreviewUrl(
    baseUrl: string,
    ancho: TicketAnchoMm,
    bust: number,
    autoPrint = false,
): string {
    const params = new URLSearchParams({
        ancho,
        _pv: String(bust),
    });

    if (autoPrint) {
        params.set('print', '1');
    }

    const sep = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${sep}${params.toString()}`;
}
