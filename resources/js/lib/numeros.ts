/** Solo dígitos. Año, kilometraje, minutos. */
export function soloEntero(value: string, maxDigits = 7): string {
    return value.replace(/\D/g, '').slice(0, maxDigits);
}

/** Número con un solo punto decimal. Precios, cantidades, porcentajes. */
export function soloDecimal(value: string, decimals = 2, maxDigits = 8): string {
    const cleaned = value.replace(/[^\d.]/g, '');
    const dot = cleaned.indexOf('.');

    if (dot === -1) {
        return cleaned.slice(0, maxDigits);
    }

    const whole = cleaned.slice(0, dot).slice(0, maxDigits);
    const fraction = cleaned
        .slice(dot + 1)
        .replace(/\./g, '')
        .slice(0, decimals);

    return `${whole}.${fraction}`;
}
