// ============================================================================
// SERVICE WORKER - FranquiConta
// Estrategia: Cache First para assets + Network First para API
// ============================================================================

const CACHE_NAME = 'franquiconta-v1.0.0';
const DEBUG = false; // Set to true for verbose SW logging
const log = DEBUG ? log.bind(console) : () => {};
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// ============================================================
// INSTALL: Precachear assets críticos
// ============================================================
self.addEventListener('install', (event) => {
  log('✅ Service Worker instalado');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      log('📦 Precacheando assets críticos...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Forzar activación inmediata (sin esperar a que cierren otras pestañas)
  self.skipWaiting();
});

// ============================================================
// ACTIVATE: Limpiar caches antiguos
// ============================================================
self.addEventListener('activate', (event) => {
  log('🔄 Service Worker activado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            log('🗑️ Eliminando cache antiguo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Tomar control de todas las pestañas inmediatamente
  self.clients.claim();
});

// ============================================================
// FETCH: Estrategias de caching
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ============================================================
  // ESTRATEGIA 1: Cache First para JS/CSS/Fonts (assets versionados)
  // ============================================================
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.endsWith('.woff2') || 
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.ttf')) {
    
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          log('💾 Cache hit:', url.pathname);
          return cachedResponse;
        }
        
        log('🌐 Descargando asset:', url.pathname);
        return fetch(request).then((response) => {
          // Solo cachear respuestas exitosas
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // ============================================================
  // ESTRATEGIA 2: Network First + Cache Fallback para API Supabase
  // ============================================================
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Solo cachear GET requests exitosos (no cachear POST/PUT/DELETE)
          if (request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar cache (modo offline)
          log('📡 Sin conexión, usando cache para:', url.pathname);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si no hay cache, devolver respuesta offline básica
            return new Response(
              JSON.stringify({ 
                error: 'Sin conexión', 
                offline: true 
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // ============================================================
  // ESTRATEGIA 3: Network First para HTML (siempre intentar red primero)
  // ============================================================
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.includes('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Fallback a cache si no hay red
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // ============================================================
  // DEFAULT: Network only para todo lo demás
  // ============================================================
  event.respondWith(fetch(request));
});

// ============================================================
// MESSAGE: Escuchar comandos del cliente
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    log('⏩ Forzando activación del nuevo Service Worker...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    log('🗑️ Limpiando cache por solicitud del cliente...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

log('🚀 Service Worker de FranquiConta inicializado');