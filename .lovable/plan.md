
Diagnóstico claro: la invitación sí se está creando en base de datos, pero el email no se está enviando.

## Lo que he verificado

### 1. La invitación existe
En `public.invites` aparecen invitaciones recientes, incluida:
- `s.navarro@nrro.es`
- creada el `2026-03-29 21:50:25+00`
- estado: pendiente
- expiración: `2026-04-05`

Eso confirma que el flujo de “crear invitación” funciona.

### 2. El problema real está en el envío del correo
La Edge Function `send-invite` sigue usando Resend con este remitente:

```ts
from: "FranquiContaSync <noreply@franquicontasync.com>"
```

Y los logs devuelven exactamente esto:

```text
403 The franquicontasync.com domain is not verified
```

O sea:
- la función responde `200 success`
- se guarda la invitación
- pero el proveedor rechaza el email
- por eso no te llega nada

### 3. Además hay un problema de UX serio
Ahora mismo el sistema dice “Invitación enviada” aunque en realidad solo significa:
- “invitación creada”
- no “email entregado” ni siquiera “email aceptado por el proveedor”

Eso es lo que está generando la confusión.

### 4. Tu proyecto ya apunta a otro sistema de email
He comprobado que el proyecto tiene dominio de correo configurado como:

```text
notify.www.nrro.es
```

pero está en estado pendiente de DNS.

Eso deja una inconsistencia importante:
- el proyecto parece preparado para usar tu dominio `nrro.es`
- pero `send-invite` sigue intentando enviar desde `franquicontasync.com`
- que no es el dominio correcto ni está verificado

## Causa raíz

Hay dos capas del problema:

1. **Dominio de envío incorrecto / no verificado**
   - se está enviando desde `franquicontasync.com`
   - ese dominio no está verificado

2. **Diseño del flujo engañoso**
   - la función no falla cuando el proveedor rechaza el email
   - el frontend muestra éxito aunque el correo no salió

## Solución recomendada “experiencia top”

No haría solo un parche. Haría una solución completa y profesional en 3 niveles:

---

## Fase 1 — Corregir el envío real

### Objetivo
Que las invitaciones se envíen desde el dominio correcto y que el sistema falle si el proveedor rechaza el correo.

### Cambios
#### A. Dejar de usar `franquicontasync.com`
En `supabase/functions/send-invite/index.ts`:
- sustituir el remitente duro por el dominio real del proyecto
- o, mejor aún, centralizar el remitente en una constante/configuración única

#### B. Si el proveedor devuelve error, responder error de verdad
Ahora mismo hace `console.error(...)` pero luego devuelve éxito.
Hay que cambiarlo para que:
- si el proveedor rechaza el email, la API responda `400/502`
- el frontend muestre “No se ha podido enviar el correo”
- no se confunda “invitación creada” con “email enviado”

#### C. Mantener el enlace de invitación aunque falle el email
La invitación en BD puede seguir existiendo, pero la respuesta debe indicar algo como:
- invitación creada
- email no enviado
- copiar enlace manualmente / reenviar después

Eso es mucho más robusto para operación real.

---

## Fase 2 — Hacer visible el estado real en Admin

### Objetivo
Que en `/admin` puedas saber exactamente qué pasó con cada invitación.

### Cambios en `PendingInvitesTable`
Añadir estado de entrega real, no solo:
- Pendiente
- Aceptada
- Expirada

Sino también algo como:

- `Email enviado`
- `Error de envío`
- `Pendiente de reenvío`
- `Aceptada`
- `Expirada`

### Recomendación de modelo
La tabla `invites` hoy no guarda nada del envío. Haría una de estas dos opciones:

#### Opción recomendada
Añadir campos a `invites`:
- `email_status` (`pending`, `sent`, `failed`)
- `email_error` text
- `email_sent_at` timestamptz
- `last_send_attempt_at` timestamptz

Así en admin puedes ver:
- si el enlace existe
- si el correo salió
- cuándo se intentó
- por qué falló

#### UX resultante
En la tabla de invitaciones:
- badge de “correo enviado” o “falló envío”
- texto corto del error
- botón “Reenviar”
- botón “Copiar enlace”

Eso te da control operativo real.

---

## Fase 3 — Flujo premium de invitaciones

### Objetivo
Que el sistema siga siendo usable incluso si el email falla o DNS aún no está listo.

### Mejoras UX
#### A. Toast correcto al invitar
Separar mensajes:
- “Invitación creada y email enviado”
- “Invitación creada, pero el email no se pudo enviar”
- “Copia el enlace manualmente mientras terminamos la configuración del dominio”

#### B. Mostrar el link de aceptación en admin
Como ya existe `token`, se puede construir:
```text
/accept-invite?token=...
```

Y en la UI:
- botón “Copiar enlace”
- botón “Abrir enlace”
- útil para WhatsApp o envío manual mientras se arregla el correo

#### C. Reenvío inteligente
El botón “Reenviar” debe:
- regenerar token o reutilizar según la política elegida
- actualizar `last_send_attempt_at`
- guardar el nuevo estado del envío
- mostrar feedback preciso

---

## Archivos a tocar

### Backend
- `supabase/functions/send-invite/index.ts`
  - usar remitente correcto
  - convertir rechazo del proveedor en error real
  - devolver payload más rico con estado de envío
  - opcional: guardar metadata de envío en `invites`

### Frontend
- `src/components/admin/InviteUserDialog.tsx`
  - mostrar éxito parcial vs éxito total
  - si falla el correo, ofrecer copiar enlace

- `src/components/admin/PendingInvitesTable.tsx`
  - añadir columnas/estado de entrega
  - mostrar error de envío
  - añadir acción “Copiar enlace”

- `src/pages/admin/UsersManagement.tsx`
  - pequeños ajustes de UX si hace falta para resaltar invitaciones con error

### Base de datos
- migración para ampliar `invites` con estado de email

## Orden de implementación recomendado

1. arreglar `send-invite` para que no devuelva falso éxito
2. añadir campos de estado de email en `invites`
3. guardar resultado del envío en la invitación
4. actualizar `InviteUserDialog` para mostrar mensajes correctos
5. actualizar `PendingInvitesTable` con estado real + copiar enlace
6. opcional: añadir filtro “Con error de envío”

## Resultado esperado

Después del cambio:
- sabrás si la invitación fue creada
- sabrás si el email salió o falló
- verás el motivo del fallo
- podrás reenviar o copiar el enlace manualmente
- el sistema dejará de decir “enviada” cuando en realidad no salió nada

## Importante para este caso concreto

Ahora mismo, aunque implementemos la mejor UX del mundo, **seguirán sin llegar los correos** hasta corregir la configuración del dominio de envío.

Con lo que he visto, hay que alinear una de estas dos estrategias:
- usar el dominio real del proyecto `nrro.es` cuando esté listo
- o mantener proveedor externo pero con un dominio realmente verificado

Ahora mismo estás en un estado mixto y por eso falla.

## Resumen ejecutivo

El bug no es que “no cree la invitación”.
El bug es que:
1. la crea,
2. el proveedor rechaza el email,
3. y la app dice igualmente que se envió.

La solución top no es solo “hacer que llegue”, sino rediseñar el flujo para que el estado de invitación y el estado del email sean visibles, auditables y accionables desde admin.
