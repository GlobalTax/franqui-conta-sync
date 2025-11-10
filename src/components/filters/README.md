# Filtros Globales de Organización

Sistema de filtros jerárquicos para navegación entre Franquiciado → Sociedad → Centro.

## Componentes

### `GlobalOrgSelector`
Selector expandido con tres selectores en línea. Ideal para dashboards.

```tsx
import GlobalOrgSelector from "@/components/filters/GlobalOrgSelector";

<GlobalOrgSelector />
```

### `CompactOrgSelector`
Selector compacto con popover. Ideal para headers y espacios reducidos.

```tsx
import CompactOrgSelector from "@/components/filters/CompactOrgSelector";

<CompactOrgSelector />
```

## Hook: `useGlobalFilters`

Gestiona el estado global de filtros con persistencia en localStorage.

### Uso básico

```tsx
import { useGlobalFilters } from "@/hooks/useGlobalFilters";

function MyComponent() {
  const {
    selectedFranchiseeId,
    selectedCompanyId,
    selectedCentreCode,
    setFranchiseeId,
    setCompanyId,
    setCentreCode,
    reset,
  } = useGlobalFilters();

  // Los filtros están disponibles de inmediato
  console.log('Centro seleccionado:', selectedCentreCode);
}
```

### Ejemplo: Filtrar queries

```tsx
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function DailyClosure() {
  const { selectedCentreCode } = useGlobalFilters();

  const { data: closures } = useQuery({
    queryKey: ['closures', selectedCentreCode],
    queryFn: async () => {
      let query = supabase.from('daily_closures').select('*');
      
      if (selectedCentreCode) {
        query = query.eq('centro_code', selectedCentreCode);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return <div>...</div>;
}
```

### Métodos disponibles

- `selectedFranchiseeId`: ID del franquiciado seleccionado
- `selectedCompanyId`: ID de la sociedad seleccionada
- `selectedCentreCode`: Código del centro seleccionado
- `setFranchiseeId(id)`: Cambia franquiciado (resetea sociedad y centro)
- `setCompanyId(id)`: Cambia sociedad (resetea centro)
- `setCentreCode(code)`: Cambia centro
- `setFilters({ ... })`: Establece múltiples filtros a la vez
- `reset()`: Limpia todos los filtros

## Comportamiento

1. **Cascada automática**: Al cambiar un nivel superior, los niveles inferiores se resetean
2. **Persistencia**: Los filtros se guardan en localStorage
3. **Auto-selección**: Si no hay franquiciado seleccionado, se selecciona el primero automáticamente
4. **Filtrado dependiente**: Las sociedades y centros se filtran según el franquiciado seleccionado

## Integración en Layout

El selector compacto ya está integrado en el header principal de la aplicación (`src/components/Layout.tsx`).

Todos los componentes de la app pueden acceder inmediatamente a los filtros usando `useGlobalFilters()`.
