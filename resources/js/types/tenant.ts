/**
 * Snapshot del tenant (taller) activo, compartido por Inertia en
 * `page.props.tenant`.
 *
 * Vale `null` cuando el request entra por el dominio central (panel del
 * superadmin): componentes que dependan del tenant deben hacer
 * `if (tenant)` antes de leerlo. En subdominios de taller
 * (`*.tallersaas.test`) siempre está presente.
 */
export type TenantEstado = 'trial' | 'active' | 'grace' | 'suspended' | 'cancelled';

export type TenantShared = {
    id: string;
    slug: string;
    razon_social: string;
    nombre_comercial: string | null;
    estado: TenantEstado;
};
