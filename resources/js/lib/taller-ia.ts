export type IaLinea = {
    servicio_id: string;
    producto_id: string;
    descripcion: string;
    cantidad: string;
    precio_unitario: string;
    stock: string | null;
    comprar: boolean;
};

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export async function postIa<T>(url: string, body: FormData): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        credentials: 'same-origin',
        body,
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
        throw new Error(payload.message ?? 'No se pudo consultar la IA.');
    }

    return payload as T;
}
