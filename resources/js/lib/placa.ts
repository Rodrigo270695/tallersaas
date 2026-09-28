export type PlacaGrupo = 'auto' | 'moto' | 'cualquiera';

const AUTO = /^\d{3}-[A-Z]{2}\d$/;
const MOTO = /^\d{2}-[A-Z]{2}\d{2}$/;
const AUTO_CLASICO = /^[A-Z]{3}-\d{3}$/;
const MOTO_CLASICO = /^[A-Z]{2}-\d{4}$/;

export function grupoPlaca(tipo: string): PlacaGrupo {
    if (tipo === 'moto') {
        return 'moto';
    }

    if (tipo === 'mototaxi' || tipo === 'otro') {
        return 'cualquiera';
    }

    return 'auto';
}

type Slot = 'D' | 'L';

function rawPlaca(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function takeSlots(raw: string, slots: Slot[]): string {
    let out = '';
    let index = 0;

    for (const slot of slots) {
        while (index < raw.length) {
            const char = raw[index];
            index += 1;
            const ok = slot === 'D' ? /\d/.test(char) : /[A-Z]/.test(char);
            if (ok) {
                out += char;
                break;
            }
        }
    }

    return out;
}

function withHyphen(body: string, at: number): string {
    if (body.length <= at) {
        return body;
    }

    return `${body.slice(0, at)}-${body.slice(at)}`;
}

function mask(raw: string, nuevo: boolean, grupo: 'auto' | 'moto'): string {
    if (grupo === 'moto') {
        const slots: Slot[] = nuevo ? ['D', 'D', 'L', 'L', 'D', 'D'] : ['L', 'L', 'D', 'D', 'D', 'D'];

        return withHyphen(takeSlots(raw, slots), 2);
    }

    const slots: Slot[] = nuevo ? ['D', 'D', 'D', 'L', 'L', 'D'] : ['L', 'L', 'L', 'D', 'D', 'D'];

    return withHyphen(takeSlots(raw, slots), 3);
}

export function formatPlaca(value: string, grupo: PlacaGrupo = 'auto'): string {
    const raw = rawPlaca(value);

    if (grupo === 'cualquiera') {
        return formatPlacaLibre(raw);
    }

    const nuevo = raw.length === 0 || /\d/.test(raw[0]);

    return mask(raw, nuevo, grupo);
}

function formatPlacaLibre(raw: string): string {
    const body = raw.slice(0, 6);
    if (body.length < 3) {
        return body;
    }

    const startsDigit = /\d/.test(body[0]);
    const thirdDigit = /\d/.test(body[2]);

    if (startsDigit && thirdDigit) {
        return mask(body, true, 'auto');
    }

    if (startsDigit) {
        return mask(body, true, 'moto');
    }

    if (thirdDigit) {
        return mask(body, false, 'moto');
    }

    return mask(body, false, 'auto');
}

export function placaValida(value: string, grupo: PlacaGrupo = 'auto'): boolean {
    const placa = value.toUpperCase();
    const patterns =
        grupo === 'moto'
            ? [MOTO, MOTO_CLASICO]
            : grupo === 'cualquiera'
              ? [AUTO, AUTO_CLASICO, MOTO, MOTO_CLASICO]
              : [AUTO, AUTO_CLASICO];

    return patterns.some((pattern) => pattern.test(placa));
}

export function mensajePlaca(grupo: PlacaGrupo = 'auto'): string {
    if (grupo === 'moto') {
        return 'La placa de una moto es 34-AW12 (o el formato anterior AB-1234).';
    }

    if (grupo === 'cualquiera') {
        return 'Usa 123-SD4 para auto o 34-AW12 para moto.';
    }

    return 'La placa de un auto es 123-SD4 (o el formato anterior ABC-123).';
}
