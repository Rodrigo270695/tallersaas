import { useCallback, useState } from 'react';

export const UNSAVED_CHANGES_MESSAGE =
    'Tienes cambios sin guardar. ¿Estás seguro que quieres descartarlos?';

function snapshot(value: unknown): string {
    return JSON.stringify(value, (_key, current) => {
        if (typeof File !== 'undefined' && current instanceof File) {
            return {
                name: current.name,
                size: current.size,
                lastModified: current.lastModified,
            };
        }

        return current;
    });
}

/**
 * Pide confirmación antes de cerrar un modal si el formulario cambió
 * respecto al último `remember`. El cierre por éxito debe seguir llamando
 * `onOpenChange(false)` directo, sin pasar por `requestClose`.
 *
 * El estado sucio vive en useState (no en un ref): el React Compiler
 * eliminaba el ref porque no participaba del render y el aviso nunca salía.
 */
export function useUnsavedFormGuard<T>(
    data: T,
    onOpenChange: (open: boolean) => void,
) {
    const [baseline, setBaseline] = useState(() => snapshot(data));
    const current = snapshot(data);
    const dirty = current !== baseline;

    const remember = useCallback((next: T) => {
        setBaseline(snapshot(next));
    }, []);

    const requestClose = useCallback(
        (next: boolean): boolean => {
            if (!next && dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) {
                return false;
            }

            onOpenChange(next);

            return true;
        },
        [dirty, onOpenChange],
    );

    return { remember, requestClose, dirty };
}
