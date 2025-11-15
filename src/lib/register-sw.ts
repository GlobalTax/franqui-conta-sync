// ============================================================================
// SERVICE WORKER REGISTRATION
// Registra y gestiona el Service Worker para caching y offline support
// ============================================================================

/**
 * Registra el Service Worker en el navegador
 * Solo se ejecuta en producción (import.meta.env.PROD)
 */
export async function registerServiceWorker() {
  // Verificar soporte del navegador
  if (!('serviceWorker' in navigator)) {
    console.log('ℹ️ Service Worker no soportado en este navegador');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    console.log('✅ Service Worker registrado:', registration.scope);

    // Escuchar actualizaciones del Service Worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('🔄 Nueva versión del Service Worker detectada');
      
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Hay nueva versión disponible
          console.log('🆕 Nueva versión disponible. Recarga la página para actualizar.');
          
          // Opcional: Mostrar notificación al usuario
          if (window.confirm('Nueva versión disponible. ¿Deseas actualizar ahora?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    // Detectar cuando el Service Worker toma control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('🔄 Service Worker actualizado, recargando...');
      window.location.reload();
    });

  } catch (error) {
    console.error('❌ Error al registrar Service Worker:', error);
  }
}

/**
 * Desregistra todos los Service Workers activos
 * Útil para debugging o cuando se quiere desactivar el cache
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('🗑️ Service Worker desregistrado');
    }
    
    // Limpiar caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((name) => caches.delete(name))
    );
    
    console.log('🗑️ Caches limpiados');
  } catch (error) {
    console.error('❌ Error al desregistrar Service Worker:', error);
  }
}

/**
 * Limpia el cache del Service Worker sin desregistrarlo
 */
export async function clearServiceWorkerCache() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration && registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      console.log('🗑️ Limpieza de cache solicitada');
    }
  } catch (error) {
    console.error('❌ Error al limpiar cache:', error);
  }
}

/**
 * Verifica si hay Service Worker activo
 */
export function isServiceWorkerActive(): boolean {
  return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
}

/**
 * Obtiene información del Service Worker actual
 */
export async function getServiceWorkerInfo() {
  if (!('serviceWorker' in navigator)) {
    return { supported: false };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  
  return {
    supported: true,
    active: !!registration?.active,
    installing: !!registration?.installing,
    waiting: !!registration?.waiting,
    scope: registration?.scope,
  };
}