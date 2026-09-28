import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { getCsrfToken } from '@/lib/csrf';
import { offlineDb, type QueuedMutation } from '@/lib/offline/db';

export const MUTATIONS_EVENT = 'tallersaas:mutations';

type VisitHooks = {
    onSuccess?: (...args: unknown[]) => void;
    onFinish?: (...args: unknown[]) => void;
    onError?: (...args: unknown[]) => void;
};

function notify(): void {
    window.dispatchEvent(new Event(MUTATIONS_EVENT));
}

function cleanBody(body: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(body).filter(([key]) => !key.startsWith('__')));
}

function hasFile(body: Record<string, unknown>): boolean {
    return Object.values(body).some(
        (value) =>
            (typeof File !== 'undefined' && value instanceof File) ||
            (typeof Blob !== 'undefined' && value instanceof Blob),
    );
}

export async function listMutations(): Promise<QueuedMutation[]> {
    const db = await offlineDb();

    if (!db) {
        return [];
    }

    return db.mutations.orderBy('createdAt').toArray();
}

export async function pendingCount(): Promise<number> {
    const db = await offlineDb();

    if (!db) {
        return 0;
    }

    return db.mutations.count();
}

export async function enqueueMutation(input: {
    method: QueuedMutation['method'];
    url: string;
    body?: Record<string, unknown>;
}): Promise<void> {
    const db = await offlineDb();

    if (!db) {
        return;
    }

    await db.mutations.add({
        id: crypto.randomUUID(),
        method: input.method,
        url: input.url,
        body: cleanBody(input.body ?? {}),
        createdAt: Date.now(),
        attempts: 0,
    });
    notify();
}

export async function flushMutations(): Promise<void> {
    const db = await offlineDb();

    if (!db || !navigator.onLine) {
        return;
    }

    const items = await db.mutations.orderBy('createdAt').toArray();
    let sent = 0;

    for (const item of items) {
        let response: Response;

        try {
            response = await fetch(item.url, {
                method: item.method,
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Inertia': 'true',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    'X-Idempotency-Key': item.id,
                },
                body: item.method === 'DELETE' ? undefined : JSON.stringify(cleanBody(item.body)),
            });
        } catch {
            await db.mutations.update(item.id, {
                attempts: item.attempts + 1,
                lastError: 'Sin conexión al enviar.',
            });
            notify();

            return;
        }

        const location = response.headers.get('Location') ?? '';
        const loginRedirect = location.includes('/login');

        if (!loginRedirect && (response.ok || response.status === 204 || response.status === 302 || response.status === 303)) {
            await db.mutations.delete(item.id);
            sent += 1;
            continue;
        }

        const attempts = item.attempts + 1;
        await db.mutations.update(item.id, {
            attempts,
            lastError:
                response.status === 422
                    ? 'El taller rechazó este cambio. Revísalo y vuelve a guardarlo.'
                    : 'No se pudo enviar este cambio.',
        });

        if (response.status === 419 || response.status === 401) {
            notify();

            return;
        }
    }

    notify();

    if (sent > 0) {
        toast.success(sent === 1 ? 'Se envió 1 cambio pendiente.' : `Se enviaron ${sent} cambios pendientes.`);
        router.reload({ preserveScroll: true, preserveState: false });
    }
}

function splitVisit(method: string, args: unknown[]): { body: Record<string, unknown>; options: VisitHooks } {
    if (method === 'delete') {
        return {
            body: {},
            options: (args[1] ?? {}) as VisitHooks,
        };
    }

    const second = args[1];
    const third = args[2];

    if (third && typeof third === 'object') {
        return {
            body: (second ?? {}) as Record<string, unknown>,
            options: third as VisitHooks,
        };
    }

    if (
        second &&
        typeof second === 'object' &&
        ('onSuccess' in second || 'onFinish' in second || 'preserveScroll' in second || 'preserveState' in second)
    ) {
        return { body: {}, options: second as VisitHooks };
    }

    return {
        body: ((second ?? {}) as Record<string, unknown>) ?? {},
        options: {},
    };
}

let routerPatched = false;

export function installOfflineRouter(): void {
    if (routerPatched || typeof window === 'undefined') {
        return;
    }

    routerPatched = true;

    (['post', 'put', 'patch', 'delete'] as const).forEach((method) => {
        const original = router[method].bind(router) as (...args: unknown[]) => void;

        (router as unknown as Record<string, (...args: unknown[]) => void>)[method] = (...args: unknown[]) => {
            if (navigator.onLine) {
                return original(...args);
            }

            const { body, options } = splitVisit(method, args);

            if ((typeof FormData !== 'undefined' && body instanceof FormData) || hasFile(body)) {
                toast.error('Sin conexión no se puede enviar este archivo. La pantalla sigue abierta.');
                options.onFinish?.();

                return;
            }

            void enqueueMutation({
                method: method.toUpperCase() as QueuedMutation['method'],
                url: String(args[0] ?? ''),
                body,
            }).then(() => {
                toast.success('Guardado en este dispositivo. Se enviará al reconectar.');
                options.onSuccess?.();
                options.onFinish?.();
            });
        };
    });

    window.addEventListener('online', () => {
        void flushMutations();
    });
}
