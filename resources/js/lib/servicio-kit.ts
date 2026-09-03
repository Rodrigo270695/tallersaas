export type ServicioKitItemOption = {
    producto_id: string;
    nombre: string;
    cantidad: string | number;
    precio_venta: string | number | null;
    unidad: string;
};

/**
 * Expande un servicio con kit en líneas de documento (OT / presupuesto / cobro).
 * La primera línea es mano de obra; las siguientes son repuestos del kit.
 */
export function expandServicioConKit<T extends Record<string, unknown>>(options: {
    servicioId: string;
    servicioNombre: string;
    servicioPrecio: string | number | null | undefined;
    kit: readonly ServicioKitItemOption[] | undefined;
    cantidadServicio: string | number;
    buildServicioLine: (base: {
        servicio_id: string;
        producto_id: string;
        cantidad: string;
        precio_unitario: string;
        label: string;
    }) => T;
    buildProductoLine: (base: {
        servicio_id: string;
        producto_id: string;
        cantidad: string;
        precio_unitario: string;
        label: string;
    }) => T;
}): T[] {
    const qty = Math.max(Number(options.cantidadServicio) || 1, 0.001);
    const servicioLine = options.buildServicioLine({
        servicio_id: options.servicioId,
        producto_id: '',
        cantidad: String(qty),
        precio_unitario:
            options.servicioPrecio != null && options.servicioPrecio !== ''
                ? String(options.servicioPrecio)
                : '',
        label: options.servicioNombre,
    });

    const kitLines = (options.kit ?? []).map((item) => {
        const kitQty = Math.max(Number(item.cantidad) || 0, 0) * qty;

        return options.buildProductoLine({
            servicio_id: '',
            producto_id: item.producto_id,
            cantidad: String(Number(kitQty.toFixed(3))),
            precio_unitario:
                item.precio_venta != null && item.precio_venta !== ''
                    ? String(item.precio_venta)
                    : '',
            label: item.nombre,
        });
    });

    return [servicioLine, ...kitLines];
}

export function spliceLinesAtIndex<T>(
    lineas: readonly T[],
    index: number,
    replacement: readonly T[],
): T[] {
    return [...lineas.slice(0, index), ...replacement, ...lineas.slice(index + 1)];
}
