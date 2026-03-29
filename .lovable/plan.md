

# Plan: Corregir sincronización sidebar ↔ top bar

## Problema raíz

Hay dos conflictos que impiden la sincronización:

1. **`CompactOrgSelector` auto-selecciona el franquiciado** al montar (línea 42-46), llamando `setFranchiseeId()` que **resetea `selectedCompanyId` y `selectedCentreCode` a null** — destruyendo los valores que el sync hook acababa de escribir.

2. **Los refs del sync hook empiezan en `null`**, así que al cargar la app con un view persistido ("129 - Granollers"), la comparación `selectedCentreCode === prevCentreCodeRef.current` da `null === null` → skip. El sync View→Filters nunca ejecuta la primera vez.

```text
Flujo actual (roto):
  1. ViewContext carga "129 - Granollers" desde localStorage
  2. Sync hook: View→Filters → setFilters({centreCode: "129", ...})
  3. CompactOrgSelector monta → auto-select franchisee → setFranchiseeId()
     → RESET centreCode=null, companyId=null  ← AQUÍ SE ROMPE
  4. Sync hook: Filters→View ve centreCode null, pero prevRef ya es null → skip
  5. Resultado: sidebar="129", top bar="Todos los centros"
```

## Solución (3 cambios)

### 1. `CompactOrgSelector.tsx` — eliminar auto-select conflictivo

Eliminar el `useEffect` que llama `setFranchiseeId` (líneas 42-46). El sync hook ya se encarga de setear el franchiseeId cuando sincroniza desde el View.

### 2. `useGlobalFilters.ts` — `setFranchiseeId` no debe resetear todo

Cambiar `setFranchiseeId` para que NO resetee `selectedCompanyId` y `selectedCentreCode`. El sync hook envía los 3 valores juntos vía `setFilters()`, así que el reset cascada es contraproducente.

### 3. `useSyncViewAndFilters.ts` — forzar sync inicial

Inicializar `prevViewRef` como un objeto diferente al view actual para que el primer `useEffect` siempre ejecute la sincronización. Cambiar la lógica de skip inicial para que compare correctamente en el primer render.

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/filters/CompactOrgSelector.tsx` | Eliminar useEffect auto-select (líneas 42-46) |
| `src/hooks/useGlobalFilters.ts` | `setFranchiseeId` solo cambia franchiseeId, sin resetear los otros |
| `src/hooks/useSyncViewAndFilters.ts` | No skipear el primer sync; usar flag `initializedRef` |

