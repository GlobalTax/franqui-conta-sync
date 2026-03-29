
Problema identificado: en la pantalla donde estás (`/treasury/reconciliation`) sí cambia la selección en el selector, pero la vista no responde porque esa página está leyendo mal el centro activo.

## Causa raíz

En `src/pages/treasury/BankReconciliation.tsx` hay este código:

```tsx
const centroCode = typeof selectedView === 'string' ? selectedView : '';
```

Pero `selectedView` no es un string: siempre es un objeto tipo:

```ts
{ type: 'centre' | 'company' | 'all', id: string, code?: string, name: string }
```

Así que `centroCode` queda siempre en `''` y toda la pantalla de conciliación se rompe funcionalmente:

- `BankAccountSelector` no filtra por centro
- `ImportNorma43Button` no recibe centro válido
- `Auto-Conciliar` no funciona con el centro seleccionado
- `ReconciliationRulesManager` y `ReconciliationAssistant` reciben un centro vacío
- da la sensación de que “lo selecciono pero no cambia”

## Qué corregir

### 1. Arreglar `centroCode` en `BankReconciliation`
En `src/pages/treasury/BankReconciliation.tsx`:

- usar `selectedView.code` cuando el tipo sea `centre`
- permitir estado consolidado cuando el tipo sea `company` o `all`
- mostrar un mensaje claro si conciliación requiere centro individual

Cambio esperado:

```tsx
const centroCode = selectedView?.type === 'centre' ? selectedView.code : undefined;
```

## 2. Ajustar la UX según la jerarquía real
Como la conciliación bancaria es por restaurante/cuenta bancaria, la página no debería intentar operar con una vista consolidada.

Propuesta en la misma pantalla:

- si `selectedView.type !== 'centre'`, mostrar alerta:
  - “Selecciona un restaurante para conciliar movimientos bancarios”
- desactivar tabs/acciones dependientes de centro hasta elegir uno

Esto hará que el comportamiento sea consistente para franquiciados:
- vista consolidada para reporting
- vista centro individual para operativa bancaria

## 3. Revisar usos incorrectos similares de `selectedView.id`
He encontrado un patrón repetido en otras pantallas: varias usan `selectedView.id` como si fuera `centro_code`, pero en realidad para centros el `id` es UUID y el código operativo está en `selectedView.code`.

Conviene revisar después estos archivos porque pueden tener el mismo fallo de “selecciono pero no cambia” o filtros vacíos:

- `src/pages/ProfitAndLoss.tsx`
- `src/pages/accounting/FiscalYearClosing.tsx`
- `src/pages/accounting/BankRemittances.tsx`
- `src/pages/accounting/PaymentTerms.tsx`
- otros hooks/páginas que pasen `selectedView.id` a `centroCode`

## Resultado esperado tras el fix
En conciliación bancaria:

- al elegir restaurante en sidebar o top bar, la cuenta bancaria se actualizará correctamente
- aparecerán las transacciones del restaurante correcto
- las reglas y el asistente trabajarán con el centro seleccionado
- dejará de parecer que el selector “no hace nada”

## Detalle técnico
Resumen del bug:

```text
Selector cambia selectedView -> selectedView = { type:'centre', id:'uuid', code:'129' }

BankReconciliation:
  typeof selectedView === 'string' ? ... : ''
=> centroCode = ''

Todos los componentes hijos reciben centro vacío
=> la UI no cambia aunque el selector sí cambió
```

## Archivos a tocar
- `src/pages/treasury/BankReconciliation.tsx` — fix principal
- opcional en segunda pasada: páginas que usan `selectedView.id` como `centroCode`

## Alcance recomendado
Haría primero un fix mínimo y seguro:

1. corregir `BankReconciliation.tsx`
2. bloquear vista consolidada en conciliación bancaria
3. luego revisar el resto de pantallas con el mismo anti-patrón
