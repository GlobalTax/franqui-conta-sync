

# Fix: MyRestaurantsCard muestra 624 restaurantes en vez de los del franquiciado

## Bug

En `MyRestaurantsCard.tsx` línea 16-21, la lógica es:
- Si `selectedView.type === 'all'` → filtra por franquiciado ✅
- **Else** (incluye `type === 'centre'`) → muestra **todos** los centros de todos los franquiciados ❌

Cuando el usuario tiene seleccionado el centro 1236, cae en el `else` y ve los 624 restaurantes.

## Fix

Cambiar la lógica para que cuando hay un centro seleccionado, busque a qué franquiciado pertenece y muestre solo los centros de ese franquiciado:

```tsx
if (selectedView?.type === 'all' && selectedView.id) {
  const f = franchiseesWithCentres.find(f => f.id === selectedView.id);
  visibleCentres = f?.centres || [];
} else if (selectedView?.type === 'centre') {
  // Find which franchisee owns this centre
  const f = franchiseesWithCentres.find(f => 
    f.centres.some(c => c.id === selectedView.id)
  );
  visibleCentres = f?.centres || [];
} else {
  // No view selected — show all user's centres
  visibleCentres = franchiseesWithCentres.flatMap(f => f.centres);
}
```

## Archivo

- `src/components/dashboard/MyRestaurantsCard.tsx` — cambiar líneas 16-21

