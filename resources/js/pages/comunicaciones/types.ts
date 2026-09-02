import type { Paginated } from '@/types';

export type WhatsAppSessionProps = {
    id: string;
    openwa_session_id: string;
    openwa_session_name: string;
    status: string;
    phone: string | null;
    push_name: string | null;
    connected_at: string | null;
    last_synced_at: string | null;
    last_error: string | null;
    is_ready: boolean;
};

export type WhatsAppProps = {
    enabled: boolean;
    configured: boolean;
    session: WhatsAppSessionProps | null;
};

export type NotificationRow = {
    id: string;
    tipo: string;
    canal: string;
    destinatario: string;
    destinatario_nombre: string | null;
    cuerpo: string;
    estado: string;
    enviar_at: string | null;
    intentos: number;
    max_intentos: number;
    error_mensaje: string | null;
    proveedor_msg_id: string | null;
    ultimo_intento_at: string | null;
    created_at: string | null;
};

export type NotificationFilters = {
    search: string;
    per_page: number;
    estado: string;
    tipo: string | null;
};

export type ColaPageProps = {
    items: Paginated<NotificationRow>;
    filters: NotificationFilters;
    stats: Record<string, number>;
    estado_options: string[];
    tipo_options: string[];
    whatsapp: WhatsAppProps;
};

export type HistoricoPageProps = Omit<ColaPageProps, 'whatsapp'>;

export const TIPO_LABEL: Record<string, string> = {
    ot_lista: 'OT lista',
    cita_creada: 'Cita creada',
    cita_actualizada: 'Cita actualizada',
    cita_reprogramada: 'Cita reprogramada',
    cita_48h: 'Recordatorio 48 h',
    cita_2h: 'Recordatorio 2 h',
    prueba: 'Prueba',
};

export const ESTADO_LABEL: Record<string, string> = {
    pendiente: 'Pendiente',
    procesando: 'Procesando',
    fallido: 'Fallido',
    enviado: 'Enviado',
    cancelado: 'Cancelado',
};

export function tipoLabel(tipo: string): string {
    return TIPO_LABEL[tipo] ?? tipo;
}

export function estadoLabel(estado: string): string {
    return ESTADO_LABEL[estado] ?? estado;
}
