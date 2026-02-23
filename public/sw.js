const CACHE_NAME = 'outlet-fc-v2';

// Solo cacheamos el shell básico de la app, NO el index.html
// Si cacheamos index.html, el browser sirve la versión vieja con hashes
// de JS que ya no existen en el nuevo deploy → pantalla en blanco.
const ASSETS_TO_CACHE = [
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png',
    '/icon-apple-touch.png'
];

self.addEventListener('install', (event) => {
    // Activa inmediatamente sin esperar a que cierren las pestañas viejas
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Elimina todos los caches viejos al activar el nuevo SW
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Para el index.html y los assets JS/CSS del bundle de Vite:
    // Siempre ir a la red primero (network-first) para garantizar
    // que se cargue la versión más reciente del build.
    const isHTMLRequest = event.request.headers.get('accept')?.includes('text/html');
    const isViteAsset = url.pathname.startsWith('/assets/');

    if (isHTMLRequest || isViteAsset) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Para iconos, manifest, y otros recursos estáticos: cache-first
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
