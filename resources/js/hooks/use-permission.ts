import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import type { Auth } from '@/types';

export type PermissionInput = string | string[];

export type UsePermissionReturn = {
    /** Lista actual de permisos del usuario autenticado (memoizada). */
    permissions: string[];
    /** Lista de roles del usuario autenticado. */
    roles: string[];
    /** True si el usuario tiene el rol superadmin. */
    isSuperadmin: boolean;
    /**
     * `can('clientes.create')` → boolean
     * `can(['clientes.create', 'clientes.update'])` → boolean (OR — basta con uno)
     */
    can: (permission: PermissionInput) => boolean;
    /** Como `can` pero exige TODOS los permisos pasados (AND). */
    canAll: (permissions: string[]) => boolean;
    /** Atajo: ¿tiene este rol? */
    hasRole: (role: string) => boolean;
};

/**
 * Hook central para chequear permisos en componentes React.
 *
 * Lee `auth.permissions` y `auth.roles` compartidos por el backend vía
 * `HandleInertiaRequests::share()`. Se actualiza automáticamente entre
 * navegaciones de Inertia (porque depende de `usePage()`).
 *
 * En frontend el `superadmin` tiene bypass total (igual que el helper
 * `isPlatformSuperadmin()` en backend).
 *
 * @example
 *   const { can, isSuperadmin } = usePermission();
 *   if (can('clientes.create')) { ... }
 */
export function usePermission(): UsePermissionReturn {
    const page = usePage<{ auth?: Auth }>();
    const auth = page.props.auth;

    const permissions = useMemo(
        () => auth?.permissions ?? [],
        [auth?.permissions],
    );
    const roles = useMemo(() => auth?.roles ?? [], [auth?.roles]);
    const permissionSet = useMemo(() => new Set(permissions), [permissions]);
    const isSuperadmin = roles.includes('superadmin');

    const can = (input: PermissionInput): boolean => {
        if (isSuperadmin) return true;
        const list = Array.isArray(input) ? input : [input];

        return list.some((p) => permissionSet.has(p));
    };

    const canAll = (list: string[]): boolean => {
        if (isSuperadmin) return true;

        return list.every((p) => can(p));
    };

    const hasRole = (role: string): boolean => roles.includes(role);

    return {
        permissions,
        roles,
        isSuperadmin,
        can,
        canAll,
        hasRole,
    };
}
