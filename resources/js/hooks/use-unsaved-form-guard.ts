import { useCallback, useRef } from 'react';

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
 */
export function useUnsavedFormGuard<T>(
    data: T,
    onOpenChange: (open: boolean) => void,
) {
    const baseline = useRef<string>(snapshot(data));

    const remember = useCallback((next: T) => {
        baseline.current = snapshot(next);
    }, []);

    const requestClose = useCallback(
        (next: boolean): boolean => {
            if (
                !next &&
                snapshot(data) !== baseline.current &&
                !window.confirm(UNSAVED_CHANGES_MESSAGE)
            ) {
                return false;
            }

            onOpenChange(next);

            return true;
        },
        [data, onOpenChange],
    );

    return { remember, requestClose };
}
