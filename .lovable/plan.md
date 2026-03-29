

# Plan: Fix build errors + Mejoras OCR

## Parte 1: Corregir TODOS los errores de build

### 1.1 `src/lib/pdf-export.ts` — eliminar import estático no usado
- Línea 1: eliminar `import jsPDF from "jspdf"` (las funciones usan import dinámico `await import("jspdf")`)
- Mantener línea 2: `import "jspdf-autotable"` (side-effect import necesario)

### 1.2 Añadir `documentType` en todos los sitios que lo requieren
El tipo `InvoiceReceived` exige `documentType` pero falta en 6 archivos:

**`src/infrastructure/persistence/supabase/mappers/InvoiceMapper.ts`**
- `receivedToDomain` (línea 22): añadir `documentType: dbInvoice.document_type || 'invoice'`
- `issuedToDomain` (línea 66): añadir `documentType: dbInvoice.document_type || 'invoice'`
- `receivedToDatabase` (línea 145): añadir `document_type: invoice.documentType`
- `issuedToDatabase` (línea 174): añadir `document_type: invoice.documentType`

**`src/domain/invoicing/use-cases/CreateInvoiceReceived.ts`** (línea 59)
- Añadir `documentType: input.documentType || 'invoice'` al objeto invoice

**`src/domain/__tests__/integration/helpers/test-data-builders.ts`** (línea 26)
- Añadir `documentType: 'invoice'` al objeto de test

**`src/domain/invoicing/use-cases/__tests__/ApproveInvoice.test.ts`** (línea 15)
- Añadir `documentType: 'invoice'` en `createPendingInvoice`

**`src/domain/invoicing/use-cases/__tests__/RejectInvoice.test.ts`** (línea 15)
- Añadir `documentType: 'invoice'` en `createPendingInvoice`

### 1.3 `src/domain/invoicing/services/InvoiceValidator.ts` (línea 250)
- `VALID_TAX_RATES` es `readonly VATRate[]` (0|4|10|21 literal), pero `line.taxRate` es `number`
- Fix: castear `line.taxRate as VATRate` en el `.includes()` call

## Parte 2: Mejoras OCR en edge function

### 2.1 Auto-matching de proveedor por NIF
**`supabase/functions/claude-invoice-ocr/index.ts`**
- Después de la extracción OCR (paso 10), si `normalized.issuer.vat_id` existe, buscar en tabla `suppliers` por `tax_id`
- Si hay match, incluir `supplier_match: { id, name, tax_id, default_account_code }` en la respuesta
- Actualizar también `supplier_id` en el registro `invoices_received`

### 2.2 AP Mapping inteligente con reglas existentes
- Reemplazar el stub hardcodeado (líneas 399-421) por una llamada al `apMapperEngine` real que ya existe en `_shared/ap/mapping-engine.ts`
- Si hay `supplier_match`, usar los datos del proveedor para que el engine aplique reglas y patrones aprendidos

### 2.3 Auto-relleno del receptor
- Después de obtener `centreData` y `centreCompanies`, si el receptor extraído por OCR está vacío, rellenar con datos de la empresa del centro
- Query adicional a `centre_companies` para obtener `nombre`, `cif` y dirección

### 2.4 Actualizar tipos frontend
**`src/hooks/useInvoiceOCR.ts`**
- Añadir `supplier_match?: { id: string; name: string; tax_id: string; default_account_code: string | null }` al `OCRResponse`

## Archivos a modificar (10 archivos)

| Archivo | Cambio |
|---------|--------|
| `src/lib/pdf-export.ts` | Eliminar import estático línea 1 |
| `src/infrastructure/.../InvoiceMapper.ts` | Añadir documentType en mappers |
| `src/domain/.../CreateInvoiceReceived.ts` | Añadir documentType |
| `src/domain/__tests__/.../test-data-builders.ts` | Añadir documentType |
| `src/domain/.../ApproveInvoice.test.ts` | Añadir documentType |
| `src/domain/.../RejectInvoice.test.ts` | Añadir documentType |
| `src/domain/.../InvoiceValidator.ts` | Cast taxRate as VATRate |
| `supabase/functions/claude-invoice-ocr/index.ts` | Supplier match + AP mapping real + receptor auto-fill |
| `src/hooks/useInvoiceOCR.ts` | Añadir supplier_match al tipo OCRResponse |

