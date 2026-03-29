
Plan: arreglar la selección para que sí cambie y hacer visible “mis restaurantes” en el dashboard

## Lo que está fallando ahora

He revisado el código y hay 4 causas reales:

1. `useSyncViewAndFilters.ts` hace el primer sync demasiado pronto.  
   Si `selectedView` se carga antes de que lleguen `useAllUserCentres/useAllUserCompanies`, guarda `franchiseeId/companyId` como `null` y luego ya no recalcula porque el guard de `prevViewRef` lo bloquea.

2. El sync inverso ignora el estado “solo franquiciado”.  
   Si en la top bar eliges franquiciado pero no sociedad/centro, `selectedView` no cambia nunca.

3. `CompactOrgSelector.tsx` ya no resetea bien la jerarquía.  
   Tras el fix anterior, cambiar franquiciado puede dejar `companyId/centreCode` antiguos, creando combinaciones inválidas y una UI que “parece no cambiar”.

4. El dashboard no muestra los restaurantes accesibles del franquiciado y, además, `useDashboardMain.ts` en vista `all` consulta centros globales en vez de limitarse a los del usuario.

## Enfoque que voy a implementar

Voy a tratar la selección de franquiciado como una vista consolidada válida de “mis restaurantes”, manteniendo sincronizados sidebar + top bar.

## Cambios

### 1. Rehacer la sincronización para soportar bien los 3 niveles
Archivo: `src/hooks/useSyncViewAndFilters.ts`

- Esperar a que exista la data necesaria antes de cerrar el primer sync View → Filters.
- Sincronizar por jerarquía completa:
  - centro seleccionado → `centreCode + companyId + franchiseeId`
  - sociedad seleccionada → `companyId + franchiseeId`
  - franquiciado seleccionado → vista consolidada
- Añadir soporte explícito al caso “solo franquiciado” en Filters → View.
- Evitar loops comparando el estado jerárquico completo, no solo refs parciales.

Resultado esperado:
- si cambias en la top bar, cambia el sidebar
- si cambias en el sidebar, cambia la top bar
- ya no se quedará un franquiciado arriba y otro centro distinto abajo

### 2. Restaurar resets jerárquicos correctos en el selector superior
Archivo: `src/components/filters/CompactOrgSelector.tsx`

- Cambiar handlers para usar `setFilters(...)` por nivel:
  - al cambiar franquiciado → limpiar sociedad y centro
  - al cambiar sociedad → limpiar centro
  - al cambiar centro → mantener franquiciado/sociedad coherentes
- Mantener “Limpiar” como reset total.

Esto corrige el estado roto actual donde puedes tener franquiciado nuevo con sociedad/centro viejos.

### 3. Hacer que el sidebar también soporte la vista consolidada del franquiciado
Archivo: `src/components/accounting/CentreSelector.tsx`

- Añadir opción seleccionable de vista consolidada por franquiciado (por ejemplo: “Todos los restaurantes de X”).
- Mantener sociedad y centro como opciones hijas.
- Cambiar el autoselect actual:
  - si solo hay 1 restaurante → seleccionar ese centro
  - si hay varios → seleccionar por defecto la vista consolidada del franquiciado, no la primera sociedad arbitraria

Esto hace que la experiencia tenga sentido para franquiciados con varios restaurantes.

### 4. Mostrar en el dashboard los restaurantes que tiene el usuario
Archivos:
- `src/pages/Dashboard.tsx`
- probablemente un componente nuevo tipo `src/components/dashboard/...`

- Añadir un bloque “Mis restaurantes” / “Restaurantes de esta vista”.
- Mostrar:
  - total de restaurantes accesibles
  - lista/chips de restaurantes
  - restaurante activo resaltado
- Si la vista es consolidada, mostrar todos los restaurantes de ese franquiciado.
- Si la vista es una sociedad, mostrar los restaurantes de esa sociedad.
- Si la vista es un centro, seguir mostrando la lista contextual para que el usuario vea claramente qué restaurantes tiene.

### 5. Limitar el dashboard solo a restaurantes accesibles del usuario
Archivo: `src/hooks/useDashboardMain.ts`

- Dejar de usar “todos los centros” de la tabla `centres` para la vista `all`.
- Resolver `centroCodes` desde los centros accesibles del usuario (`v_user_centres` / hooks derivados), filtrados por franquiciado/sociedad según la vista activa.
- Mantener para centro individual el uso de `selectedView.code`.

Esto evita que la vista consolidada del dashboard mezcle centros que no corresponden al franquiciado.

## Archivos a tocar

- `src/hooks/useSyncViewAndFilters.ts`
- `src/components/filters/CompactOrgSelector.tsx`
- `src/components/accounting/CentreSelector.tsx`
- `src/pages/Dashboard.tsx`
- `src/hooks/useDashboardMain.ts`

## Resultado esperado

Después del cambio:

- seleccionar franquiciado/sociedad/centro sí cambiará la vista real
- sidebar y top bar mostrarán siempre la misma selección
- el dashboard enseñará los restaurantes que tiene ese franquiciado
- la vista consolidada será útil y entendible para un franquiciado con varios restaurantes
- no se mezclarán restaurantes de otros usuarios en el dashboard
