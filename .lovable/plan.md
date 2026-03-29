

# Plan: Arreglar el bloqueo de invitaciones duplicadas

## Problema

La Edge Function `send-invite` rechaza con 409 ("Ya existe una invitación pendiente para este email") cuando ya hay una invitación no aceptada y no expirada para ese email. En la tabla `invites` hay invitaciones recientes (del 29 de marzo, expiran el 5 de abril) que bloquean cualquier reenvío.

## Solución

Dos cambios:

### 1. Edge Function: reemplazar invitación existente en vez de rechazar

En `supabase/functions/send-invite/index.ts`, cuando ya existe una invitación pendiente para el mismo email:
- **Eliminar la invitación anterior** y crear una nueva (en vez de devolver 409)
- Esto permite "reenviar" simplemente volviendo a invitar

Cambio concreto: reemplazar el bloque que devuelve 409 por un `DELETE` de la invitación existente antes de insertar la nueva.

### 2. Frontend: añadir botón "Reenviar" en la tabla de invitaciones (opcional, mejora UX)

Si quieres también poder ver las invitaciones pendientes y reenviarlas, puedo añadir una pestaña/sección en UsersManagement que liste las invitaciones pendientes con opción de reenviar o cancelar.

## Archivo a tocar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/send-invite/index.ts` | Reemplazar invitación existente en vez de 409 |

