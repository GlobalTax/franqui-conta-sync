

# Plan: Migrar OCR de Mindee a Claude (Anthropic Vision)

## Resumen

Reemplazar Mindee Invoice API por Claude Vision (claude-sonnet-4-20250514) para el escaneo de facturas. Claude puede analizar PDFs/imágenes directamente usando su capacidad de visión, extrayendo datos estructurados con un prompt especializado en PGC español.

## Ventaja de costes

- **Mindee**: ~€0.10/página (API dedicada)
- **Claude Sonnet**: ~$0.003 input + $0.015 output por 1K tokens. Una factura típica (1 página) consume ~1500 tokens input + ~500 output ≈ **$0.012 (~€0.011)** por factura
- **Ahorro estimado**: ~89% menos coste por factura (5,000 facturas: ~€55/mes vs €500/mes)

## Cambios necesarios

### 1. Nueva edge function `claude-invoice-ocr/index.ts`
- Recibe `invoice_id`, `documentPath`, `centroCode`
- Descarga PDF de Supabase Storage
- Convierte a base64 y envía a Claude Vision API con un prompt estructurado
- El prompt le pide a Claude devolver JSON con la estructura `EnhancedInvoiceData` existente
- Normaliza con `normalizeBackend()` (reutiliza la pipeline fiscal existente)
- Actualiza `invoices_received` con los campos OCR
- Registra en `ocr_processing_log` con `provider: 'claude'`

### 2. Prompt de extracción especializado
Prompt con instrucciones para:
- Extraer: número factura, fecha, NIF emisor/receptor, desglose IVA (10%, 21%), líneas, total
- Devolver JSON estricto compatible con `EnhancedInvoiceData`
- Indicar nivel de confianza por campo
- Detectar tipo de documento (factura, abono, ticket)

### 3. Actualizar `useBulkInvoiceUpload.ts`
- Cambiar invocación de `mindee-invoice-ocr` → `claude-invoice-ocr`
- Adaptar campos de respuesta (ya no hay `mindee_document_id`, etc.)
- Actualizar campos de coste y métricas

### 4. Actualizar `useMindeeInvoiceOCR.ts` → `useClaudeInvoiceOCR.ts`
- Renombrar hook y adaptar interfaz de resultado
- Actualizar `useReprocessMindeeOCR` → `useReprocessClaudeOCR`

### 5. Actualizar config y limpieza
- Añadir `claude-invoice-ocr` a `config.toml`
- Actualizar referencias en componentes que usen los hooks de OCR

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `supabase/functions/claude-invoice-ocr/index.ts` | Crear |
| `src/hooks/useClaudeInvoiceOCR.ts` | Crear (reemplaza useMindeeInvoiceOCR) |
| `src/hooks/useBulkInvoiceUpload.ts` | Modificar (cambiar endpoint) |
| `supabase/functions/config.toml` | Modificar |
| Componentes que importan `useMindeeInvoiceOCR` | Actualizar imports |

## Notas técnicas

- Se reutiliza `ANTHROPIC_API_KEY` ya configurada como secret
- Se reutiliza toda la pipeline de normalización fiscal (`normalizeBackend`, `validateInvoiceEntry`)
- Claude Vision soporta PDFs nativamente (envío como base64 con media_type `application/pdf`)
- No se necesita conversión PDF→imagen; Claude procesa PDFs directamente
- Los módulos `_shared/mindee/` quedan como legacy pero no se eliminan aún

