

# Plan: Arreglar errores del generador de datos demo

## Problemas encontrados

Hay **3 bugs** que causan fallos en la generación y datos incompletos:

### Bug 1: `import_batch_id` es UUID pero se genera como string
- `bank_transactions.import_batch_id` es tipo `uuid` en la DB
- `generateBatchId()` devuelve `"DEMO-1774966847735-C7S81FB"` (no es UUID)
- Error: `invalid input syntax for type uuid`

### Bug 2: Columnas inexistentes en `invoices_received`
- El código inserta `ocr_processed`, `total_base`, `total_iva` — ninguna existe
- Las columnas reales son: `subtotal`, `tax_total` (y no hay `ocr_processed`)
- Error: `Could not find the 'ocr_processed' column`

### Bug 3: Columnas de `invoices_issued` incorrectas
- El código usa `subtotal`, `tax_total` para `invoices_issued` — hay que verificar que coincidan con el schema real

## Solución

### 1. `src/lib/demo/demoDataHelpers.ts`
- Cambiar `generateBatchId()` para que devuelva un UUID real (`crypto.randomUUID()`)

### 2. `src/lib/demo/demoDataGenerators.ts` — Función `generateInvoices`
- **Facturas recibidas**: cambiar `total_base` → `subtotal`, `total_iva` → `tax_total`, eliminar `ocr_processed`
- **Facturas emitidas**: verificar y alinear columnas con el schema real
- Quitar `import_batch_id` de bank_transactions o usar UUID

### 3. `src/components/admin/DemoDataGenerator.tsx`
- Quitar `import_batch_id` del insert de bank_transactions (o usar UUID)

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/demo/demoDataHelpers.ts` | `generateBatchId` devuelve UUID |
| `src/lib/demo/demoDataGenerators.ts` | Corregir nombres de columnas en invoices_received e invoices_issued |

