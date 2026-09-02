export type DashboardCapabilities = {
    citas: boolean;
    ordenes: boolean;
    ventas: boolean;
    caja: boolean;
    citas_create: boolean;
    ordenes_create: boolean;
    caja_open: boolean;
};

export type DashboardKpis = {
    citas_hoy: number;
    citas_pendientes_hoy: number;
    ot_abiertas: number;
    ot_listas: number;
    ventas_hoy_count: number;
    ventas_hoy_total: string;
};

export type DashboardCitaHoy = {
    id: string;
    inicia_at: string | null;
    duracion_minutos: number;
    estado: string;
    motivo: string | null;
    cliente_nombre: string | null;
    vehiculo_placa: string | null;
    sede_nombre: string | null;
};

export type DashboardOrdenActiva = {
    id: string;
    numero: string;
    estado: string;
    saldo: string | number;
    cliente_nombre: string | null;
    vehiculo_placa: string | null;
};

export type DashboardSesion = {
    id: string;
    sede_id: string;
    sede_nombre: string | null;
    opened_at: string | null;
    saldo_apertura: string | number;
} | null;

export type OnboardingStep = {
    id: string;
    title: string;
    description: string;
    href: string | null;
    completed: boolean;
    current: boolean;
    locked: boolean;
    required: boolean;
};

export type OnboardingSnapshot = {
    show: boolean;
    completed: boolean;
    paso: number;
    total_steps: number;
    completed_steps: number;
    preview: boolean;
    steps: OnboardingStep[];
};

export type DashboardIndexProps = {
    taller_label: string;
    capabilities: DashboardCapabilities;
    onboarding: OnboardingSnapshot | null;
    moneda: string;
    hoy_label: string;
    greeting: string;
    kpis: DashboardKpis;
    citas_hoy: readonly DashboardCitaHoy[];
    ordenes_activas: readonly DashboardOrdenActiva[];
    mi_sesion: DashboardSesion;
};

export type DashboardCentralProps = {
    stats: {
        talleres_total: number;
        talleres_activos: number;
    };
};
