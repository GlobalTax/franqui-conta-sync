

# Plan: Eliminar "Sociedad" como nivel de filtro — simplificar a Franquiciado > Restaurante

## Concepto

La jerarquía de selección pasa de 3 niveles (Franquiciado > Sociedad > Centro) a 2 niveles (Franquiciado > Restaurante). La sociedad sigue existiendo en la base de datos asociada a cada restaurante, pero deja de ser un filtro seleccionable por el usuario.

## Cambios

### 1. `CompactOrgSelector.tsx` — eliminar selector de Sociedad

- Quitar el bloque "Entidad Mercantil" (líneas 123-143)
- Quitar `selectedCompanyId` / `handleCompanyChange` 
- Los centros se listan directamente filtrados por franquiciado (sin filtro intermedio de sociedad)
- El badge de filtro activo de sociedad desaparece
- Limpiar la referencia a `useCompanies`

### 2. `CentreSelector.tsx` — eliminar opciones de Sociedad en sidebar

- Quitar las `SelectItem` de `company:*` (líneas 173-187)
- La lista queda: header franquiciado → "Todos los restaurantes" → centros individuales
- En auto-select, quitar el fallback a `type: 'company'` (líneas 44-55)

### 3. `useGlobalFilters.ts` — eliminar `selectedCompanyId`

- Quitar el campo `selectedCompanyId` del store
- Quitar `setCompanyId`
- Quitar `companyId` de `setFilters`
- Actualizar `reset` para no incluirlo
- Actualizar el key de persistencia (para invalidar estado guardado con company viejo)

### 4. `useSyncViewAndFilters.ts` — eliminar referencias a company

- Quitar toda la lógica de resolución de `companyId`
- Simplificar sync a solo 2 niveles: centro → `franchiseeId + centreCode`, o franchisee → `franchiseeId`
- Quitar el caso `selectedView.type === 'company'` en ambas direcciones

### 5. `ViewContext` — eliminar tipo `company` de `ViewSelection`

- Quitar `'company'` del union type
- Dejar solo `'centre' | 'all'`

### 6. Otras páginas que usen `selectedCompanyId`

- Buscar y limpiar cualquier referencia a `selectedCompanyId` o `type === 'company'` en páginas como `ProfitAndLoss`, `BankReconciliation`, etc.

## Resultado

- Selector top bar: Franquiciado → Restaurante (2 dropdowns)
- Selector sidebar: Franquiciado (header) → "Todos" → Restaurantes individuales
- Menos complejidad, menos bugs de sincronización
- La sociedad se consulta cuando hace falta (ej. datos fiscales de una factura) directamente desde la relación centro→sociedad

