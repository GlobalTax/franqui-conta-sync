
Plan: arreglar Realtime de notificaciones de raíz

## Diagnóstico real

Hay 2 causas probables y ambas están presentes:

1. **El hook se está montando varias veces con el mismo canal**
   - `NotificationBell` llama a `useNotifications()`
   - y además `useUnreadCount()`, que internamente vuelve a llamar a `useNotifications()`
   - en `/notificaciones` pasa otra vez: `useNotifications()` + `useUnreadCount()`
   - eso crea **suscripciones duplicadas** usando siempre el mismo nombre de canal: `notifications-realtime`

   Resultado: un canal pisa/cierra al otro y aparecen logs como:
   - “Suscripcion Realtime cerrada”
   - “Error en canal Realtime”

2. **La tabla `alert_notifications` no está publicada en `supabase_realtime`**
   - he consultado `pg_publication_tables` y `alert_notifications` **no aparece**
   - así que aunque el frontend se suscriba bien, Postgres Realtime no va a emitir cambios de esa tabla

## Lo que sí está bien

- La tabla `alert_notifications` existe
- Las políticas RLS de lectura/actualización para el destinatario existen
- El problema no parece ser de permisos de lectura

## Cambios propuestos

### 1. Rehacer `useNotifications` para que no cree canales duplicados
Archivo:
- `src/hooks/useNotifications.ts`

Cambio:
- convertirlo en un hook que exponga todo lo necesario desde **una sola fuente**
- devolver:
  - `notifications`
  - `unreadCount`
  - `isLoading`
- eliminar el patrón actual donde `useUnreadCount()` vuelve a llamar al hook principal

Además:
- usar un **nombre de canal único por usuario/instancia** o asegurar una sola suscripción activa
- limpiar correctamente el canal anterior antes de volver a suscribirse
- evitar suscribirse si no hay usuario autenticado

### 2. Simplificar consumidores para usar una sola instancia del hook
Archivos:
- `src/components/notifications/NotificationBell.tsx`
- `src/pages/Notifications.tsx`

Cambio:
- en cada componente, llamar **una sola vez** al hook
- leer `unreadCount` desde el mismo resultado del hook
- no volver a disparar otra suscripción indirectamente

Impacto esperado:
- en `/admin`, la campana dejará de abrir 2 canales
- en `/notificaciones`, la página dejará de abrir 2-3 canales superpuestos

### 3. Activar Realtime para `alert_notifications`
Archivo:
- nueva migración SQL en `supabase/migrations/`

Cambio:
- añadir `public.alert_notifications` a la publicación `supabase_realtime`

Esto es imprescindible para que `INSERT/UPDATE` lleguen al cliente en tiempo real.

### 4. Endurecer el manejo de estados del canal
Archivo:
- `src/hooks/useNotifications.ts`

Cambio:
- manejar mejor `SUBSCRIBED`, `CLOSED`, `CHANNEL_ERROR`, y opcionalmente `TIMED_OUT`
- registrar contexto útil en logs para distinguir:
  - cierre por cleanup normal
  - cierre por colisión de canal
  - error real del backend Realtime

## Diseño recomendado

La forma más limpia aquí es:

```text
useNotifications()
  -> query inicial
  -> 1 sola suscripción realtime
  -> devuelve:
     notifications
     unreadCount
     isLoading
```

Y quitar:
```text
useUnreadCount() -> useNotifications() -> suscripción duplicada
```

## Archivos a tocar

- `src/hooks/useNotifications.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/pages/Notifications.tsx`
- `supabase/migrations/...sql` para `supabase_realtime`

## Resultado esperado

Después del cambio:

- desaparecerán los cierres/errores repetidos del canal
- la campana de notificaciones no creará suscripciones duplicadas
- la página de notificaciones tampoco duplicará queries/canales
- los `INSERT/UPDATE` sobre `alert_notifications` llegarán de verdad por Realtime
- el contador de no leídas y la lista se actualizarán sin refrescar

## Nota técnica importante

He visto otros componentes con Realtime (`ocr_circuit_breaker`, `invoices_received`, `ocr_processing_log`) y la consulta a `pg_publication_tables` tampoco devuelve esas tablas. O sea, el problema puede ser más amplio que notificaciones. Para este fix me centraría primero en `alert_notifications`, y después revisaría si queréis estandarizar Realtime en el resto de módulos.

## Orden de implementación

1. refactor de `useNotifications`
2. simplificar `NotificationBell` y `Notifications`
3. migración para publicar `alert_notifications` en Realtime
4. prueba en `/admin` y `/notificaciones` verificando que ya no aparecen `CLOSED` / `CHANNEL_ERROR`
