/**
 * Service Worker de TallerSaaS.
 *
 * Manual (sin Workbox/vite-plugin-pwa), igual patrón que VetSaaS:
 *  - Cachea el "app shell" (assets estáticos) con estrategia cache-first.
 *  - Navegación (páginas Inertia) con network-first + fallback a caché,
 *    para que la última pantalla vista siga disponible sin conexión.
 *  - Notificaciones push básicas, listas para cuando se active el envío
 *    de notificaciones desde el backend.
 *
 * Sube la versión del caché cuando cambies esta lista o la estrategia,
 * para invalidar lo que quedó guardado en los navegadores de los usuarios.
 */
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `tallersaas-static-${CACHE_VERSION}`;
const OFFLINE_CACHE = `tallersaas-offline-${CACHE_VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, OFFLINE_CACHE];

const PRECACHE_URLS = [
    '/manifest.json',
    '/logo.png',
    '/icons/pwa/icon-192.png',
    '/icons/pwa/icon-512.png',
];

const STATIC_ASSET_PATTERN =
    /\/(build|icons|fonts)\/|\.(?:css|js|mjs|woff2?|ttf|png|jpe?g|svg|webp|ico)$/;

// Nunca se debe servir desde caché ni cachear (auth, API interna, formularios).
const NETWORK_ONLY_PATTERN =
    /^\/(login|logout|register|dashboard|settings|api|forgot-password|reset-password|two-factor|confirm-password|verify-email)(\/|$)/;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => !CURRENT_CACHES.includes(key))
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    if (NETWORK_ONLY_PATTERN.test(url.pathname)) {
        return;
    }

    const isNavigation =
        request.mode === 'navigate' ||
        request.headers.get('accept')?.includes('text/html');

    if (isNavigation) {
        event.respondWith(networkFirst(request));

        return;
    }

    if (STATIC_ASSET_PATTERN.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
    }
});

async function networkFirst(request) {
    const cache = await caches.open(OFFLINE_CACHE);

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch {
        const cached = await cache.match(request);

        return cached ?? Response.error();
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch {
        return Response.error();
    }
}

self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }

    let payload = {};
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'TallerSaaS', body: event.data.text() };
    }

    const title = payload.title ?? 'TallerSaaS';
    const options = {
        body: payload.body ?? '',
        icon: '/icons/pwa/icon-192.png',
        badge: '/icons/pwa/icon-192.png',
        data: { url: payload.url ?? '/dashboard' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url ?? '/dashboard';

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                const existing = clients.find((client) =>
                    client.url.includes(targetUrl),
                );
                if (existing) {
                    return existing.focus();
                }

                return self.clients.openWindow(targetUrl);
            }),
    );
});
