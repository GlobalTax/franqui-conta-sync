

# Plan: Exportacion Excel profesional para todos los informes

## Problema actual

El `ExportButton` compartido usa `json_to_sheet` basico — vuelca datos planos sin cabeceras formateadas, sin totales, sin colores ni anchos de columna. Solo el P&L tiene export con formato (en `pl-export-excel.ts`).

## Informes afectados

| Informe | Pagina | Estado export actual |
|---------|--------|---------------------|
| Sumas y Saldos | TrialBalance.tsx | json_to_sheet plano |
| Balance de Situacion | BalanceSheet.tsx | json_to_sheet plano |
| Libro Mayor | GeneralLedger.tsx | json_to_sheet plano |
| Libro Diario | JournalBook.tsx | json_to_sheet plano |
| Consolidado | ConsolidatedReports.tsx | Sin export |
| Libro de Bienes | AssetsRegister.tsx | Export basico propio |
| P&L | ProfitAndLoss.tsx | Ya tiene formato profesional |

## Solucion

### 1. Crear `src/lib/report-excel-export.ts` — utilidad compartida

Funciones de formato reutilizables usando la libreria `xlsx` (ya instalada):
- `createStyledHeader()` — fila de cabecera con fondo azul, texto blanco, fuente 12pt
- `addTotalsRow()` — fila de totales con fondo gris y negrita
- `setColumnWidths()` — anchos automaticos basados en contenido
- `addReportMetadata()` — nombre empresa, centro, periodo, fecha generacion
- `formatCurrency()` — formato numerico espanol (#.##0,00)
- `applyAlternateRowShading()` — filas alternas con fondo suave

### 2. Export dedicado por informe

Cada informe tendra su propia funcion de export que usa las utilidades compartidas:

**Sumas y Saldos** (`exportTrialBalance`):
- Cabecera: Centro, Periodo, Fecha generacion
- Columnas: Cuenta | Descripcion | Debe | Haber | Saldo Deudor | Saldo Acreedor
- Totales al final con suma
- Agrupacion visual por nivel de cuenta (grupos 1-9 con fondo)

**Balance de Situacion** (`exportBalanceSheet`):
- 2 hojas: Activo y Pasivo+PN
- Jerarquia visual con indentacion por nivel
- Totales parciales y total general

**Libro Mayor** (`exportGeneralLedger`):
- Cabecera con cuenta seleccionada y periodo
- Columnas: Fecha | Asiento | Concepto | Debe | Haber | Saldo acumulado
- Saldo final resaltado

**Libro Diario** (`exportJournalBook`):
- Agrupado por asiento (numero de asiento como separador)
- Columnas: Fecha | Asiento | Cuenta | Descripcion | Debe | Haber
- Subtotales por asiento

**Consolidado** (`exportConsolidated`):
- Multi-hoja: una por centro + hoja resumen
- Totales consolidados

**Libro de Bienes** (`exportAssetsRegister`):
- Columnas: Descripcion | Fecha alta | Valor | Amortizacion acumulada | Valor neto | Vida util
- Totales de valor y amortizacion

### 3. Modificar `ExportButton.tsx`

Anadir prop opcional `onExportFormattedExcel` para que cada pagina pueda pasar su funcion de export profesional. Si existe, reemplaza el export generico; si no, mantiene el basico como fallback.

### 4. Conectar cada pagina de informe

Cada pagina importa su funcion de export y la pasa al `ExportButton` via la nueva prop.

## Archivos

| Archivo | Accion |
|---------|--------|
| `src/lib/report-excel-export.ts` | Crear — utilidades compartidas de formato |
| `src/lib/report-exports/trialBalanceExport.ts` | Crear — export Sumas y Saldos |
| `src/lib/report-exports/balanceSheetExport.ts` | Crear — export Balance |
| `src/lib/report-exports/generalLedgerExport.ts` | Crear — export Libro Mayor |
| `src/lib/report-exports/journalBookExport.ts` | Crear — export Libro Diario |
| `src/lib/report-exports/assetsRegisterExport.ts` | Crear — export Libro Bienes |
| `src/components/reports/ExportButton.tsx` | Modificar — anadir prop `onExportFormattedExcel` |
| `src/pages/reports/TrialBalance.tsx` | Modificar — conectar export |
| `src/pages/reports/BalanceSheet.tsx` | Modificar — conectar export |
| `src/pages/reports/GeneralLedger.tsx` | Modificar — conectar export |
| `src/pages/reports/JournalBook.tsx` | Modificar — conectar export |
| `src/pages/reports/AssetsRegister.tsx` | Modificar — conectar export |

## Detalle tecnico

- Se usa `xlsx` (SheetJS) que ya esta instalada — no necesita dependencias nuevas.
- Los estilos de celda (colores, bordes, negrita) requieren `xlsx-style` o manipulacion directa de `ws['!cols']`, `ws['!rows']` y propiedades `s` de cada celda. SheetJS community edition tiene soporte limitado de estilos; se usara el approach de `aoa_to_sheet` con anchos de columna y formato numerico (como ya hace `pl-export-excel.ts`).
- Formato numerico espanol: `#.##0,00 €` para importes.

