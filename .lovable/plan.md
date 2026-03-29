

# Plan: Corregir errores de build TypeScript

## Problema
El build falla por errores de TypeScript en varios archivos que no fueron modificados recientemente. Esto impide que la preview cargue correctamente, mostrando una pantalla en blanco.

## Errores principales (3 categorías)

### 1. `useFiscalModels.ts` y `useLaborCostKPIs.ts`
Usan tablas (`stg_nominas`, `orquest_schedules`) que no están en los tipos generados de Supabase. 
**Fix**: Castear `.from()` con `as any` para evitar el error de tipos.

### 2. `generateMigrationPDF.ts`
`autoTable` no se encuentra como nombre global.
**Fix**: Importar correctamente `jspdf-autotable` y usar `(doc as any).autoTable(...)`.

### 3. `StepApertura.tsx`, `StepBancos.tsx`, `StepCierre.tsx`, `StepIVA.tsx`
`catch(error)` tipado como `unknown` pasado a función que espera `string | Error`.
**Fix**: Castear `error as Error` o `String(error)`.

### 4. `CloseAccountingPeriod.ts`
Tabla `accounting_entry_lines` no en tipos generados.
**Fix**: Castear con `as any`.

## Archivos a editar (~7 archivos)

1. **`src/hooks/useFiscalModels.ts`** — añadir `as any` en `.from('stg_nominas')`
2. **`src/hooks/useLaborCostKPIs.ts`** — añadir `as any` en `.from('stg_nominas')` y `.from('orquest_schedules')`
3. **`src/lib/migration/generateMigrationPDF.ts`** — fix import de autoTable
4. **`src/components/accounting/migration/StepApertura.tsx`** — castear error
5. **`src/components/accounting/migration/StepBancos.tsx`** — castear error
6. **`src/components/accounting/migration/StepCierre.tsx`** — castear error (2 sitios)
7. **`src/components/accounting/migration/StepIVA.tsx`** — castear error
8. **`src/domain/accounting/use-cases/CloseAccountingPeriod.ts`** — castear `.from()` con `as any`

## Resultado
El build compilará sin errores y la app volverá a funcionar normalmente en la preview.

