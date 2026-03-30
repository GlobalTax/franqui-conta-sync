

# Fix: Realtime notifications — canal duplicado causa errores

## Problema raíz

`useNotifications()` se llama desde **dos sitios simultáneamente**:
1. `NotificationBell` (siempre montado en `Layout.tsx`)
2. `Notifications` página (cuando el usuario navega a `/notificaciones`)

Cada instancia del hook crea un canal Realtime con el **mismo nombre** (`notif-${userId}`). Supabase rechaza el duplicado → cierra uno → errores en consola → ninguno funciona.

Además, `useUnreadCount()` sigue existiendo y llama internamente a `useNotifications()`, pudiendo crear una tercera instancia.

## Solución

Convertir la suscripción Realtime en un **singleton a nivel de módulo** que no dependa del ciclo de vida de React.

### Cambios en `src/hooks/useNotifications.ts`

1. **Extraer la suscripción a una función singleton** con un `Map` a nivel de módulo que guarde el canal activo por userId
2. Cuando el hook se monta, llama a `ensureRealtimeChannel(userId)` — si ya existe un canal para ese usuario, no crea otro
3. Solo el último cleanup (cuando todos los consumidores se desmontan) elimina el canal
4. Usar un **contador de referencias** para saber cuántas instancias del hook están activas

```text
Módulo level:
  activeChannels: Map<userId, { channel, refCount }>

useNotifications():
  mount  → refCount++ → si refCount === 1: crear canal
  unmount → refCount-- → si refCount === 0: eliminar canal
```

5. **Eliminar `useUnreadCount`** por completo — ya no tiene sentido y solo causa duplicaciones

### Archivos

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useNotifications.ts` | Singleton de canal + eliminar useUnreadCount |

No se necesitan cambios en los consumidores (`NotificationBell`, `Notifications`) porque ya usan `useNotifications()` correctamente.

