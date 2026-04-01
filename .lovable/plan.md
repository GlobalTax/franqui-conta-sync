

# Plan: Apertura y Cierre de Ejercicios Fiscales funcional

## Estado actual

- **`/contabilidad/cierre-ejercicio`** (FiscalYearClosing.tsx): existe pero `fiscalYearId` esta hardcodeado como `"some-fiscal-year-id"` — no funciona.
- **`/contabilidad/ejercicios-historicos`** (HistoricalYears.tsx): lista ejercicios y permite eliminar/rollback, pero no crear ni abrir nuevos ejercicios.
- **`useFiscalYears.ts`**: tiene `useCreateFiscalYear` y `useCloseFiscalYear` ya implementados.
- **DB `fiscal_years`**: tiene campos `status`, `closing_date`, `closed_by`, `closing_entry_id`, `centro_code`, `year`, `start_date`, `end_date`.
- **RPCs**: `generate_closing_entries` y `get_opening_balances` ya existen en Supabase.

## Que se hara

### 1. Refactorizar FiscalYearClosing.tsx — conectar con datos reales

- Reemplazar el hardcoded `fiscalYearId = "some-fiscal-year-id"` por un **selector de ejercicio fiscal** que cargue los ejercicios abiertos del centro seleccionado usando `useFiscalYears`.
- El usuario elige el ejercicio a cerrar del dropdown.
- La fecha de cierre se calcula automaticamente del `end_date` del ejercicio.
- Solo se pueden cerrar ejercicios con status `open` o `active`.

### 2. Anadir boton/dialog de Apertura de Ejercicio

En la misma pagina (o en HistoricalYears), anadir un dialog para **crear un nuevo ejercicio fiscal**:
- Campos: ano, fecha inicio, fecha fin (pre-rellenados: 1 enero — 31 diciembre del ano siguiente al ultimo ejercicio).
- Usa el hook `useCreateFiscalYear` que ya existe.
- Validacion: no permitir crear un ejercicio duplicado (mismo ano + centro).

### 3. Flujo completo en una sola pagina

Reorganizar `/contabilidad/cierre-ejercicio` para mostrar:

```text
┌─────────────────────────────────────────┐
│  Ejercicios Fiscales — [Centro X]       │
│                                         │
│  [+ Abrir Nuevo Ejercicio]              │
│                                         │
│  ┌─ Tabla de ejercicios ──────────────┐ │
│  │ Ano  │ Inicio  │ Fin   │ Estado   │ │
│  │ 2026 │ 01/01   │ 31/12 │ Abierto  │ │
│  │ 2025 │ 01/01   │ 31/12 │ Cerrado  │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ── Seleccionar ejercicio para cerrar ──│
│  [Dropdown: 2026 (Abierto)]            │
│                                         │
│  [Preview asientos regularizacion]      │
│  [Preview saldos apertura]              │
│  [Cerrar Ejercicio]                     │
└─────────────────────────────────────────┘
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/accounting/FiscalYearClosing.tsx` | Refactor completo: selector de ejercicio real, dialog de apertura, tabla de ejercicios |
| `src/hooks/useFiscalYears.ts` | Sin cambios (ya tiene create + close) |
| `src/hooks/useClosingEntries.ts` | Sin cambios (RPCs ya existen) |

## Detalle tecnico

- El selector de ejercicio filtra por `centro_code` del centro seleccionado y muestra solo los que tienen `status !== 'closed'`.
- Al confirmar cierre: se llama `useCloseFiscalYear` que actualiza `status = 'closed'` + las RPCs `generate_closing_entries` y `get_opening_balances` para preview.
- Al abrir ejercicio: se llama `useCreateFiscalYear` con validacion de duplicado.
- Se mantiene la compatibilidad con el `useGlobalFiscalYear` para el selector global del sidebar.

