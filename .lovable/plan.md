

# Plan: Eliminar todos los motores OCR legacy, dejar solo Claude

## Alcance

Hay **46 archivos en src/** y **17 en supabase/functions/** con referencias a Mindee, OpenAI, Gemini o Google Vision. Hay que limpiar todo y consolidar en Claude.

## Archivos a eliminar

| Archivo | Razón |
|---------|-------|
| `src/hooks/useMindeeInvoiceOCR.ts` | Hook legacy Mindee |
| `src/components/invoices/MindeeMetricsCard.tsx` | Componente legacy Mindee |
| `supabase/functions/mindee-invoice-ocr/index.ts` | Edge function legacy |
| `supabase/functions/_shared/mindee/` (directorio completo) | Módulo shared legacy |
| `supabase/functions/_shared/ocr/openai-client.ts` | Cliente OpenAI legacy |
| `supabase/functions/_shared/ocr/openai-adapter.ts` | Adaptador OpenAI legacy |
| `supabase/functions/_shared/ocr/orchestrator.ts` | Orquestador OpenAI legacy |

## Archivos a limpiar (quitar referencias legacy, usar Claude)

### Frontend - Componentes UI

| Archivo | Cambios |
|---------|---------|
| `src/components/invoices/inbox/InboxFiltersBar.tsx` | Eliminar opciones de filtro "openai" y "mindee", dejar solo "claude" |
| `src/components/invoices/inbox/InboxTopFilters.tsx` | Igual: eliminar selectores openai/mindee |
| `src/components/invoices/inbox/InvoiceInboxSidebar.tsx` | Reemplazar `ms_openai`, `ms_mindee`, engine="openai" por Claude |
| `src/components/invoices/inbox/ReprocessOCRSimpleDialog.tsx` | Cambiar texto de "Mindee" a "Claude Vision" |
| `src/components/invoices/OCRDebugBadge.tsx` | Eliminar badges OpenAI/Mindee, mostrar Claude |
| `src/pages/digitalizacion/MigrationValidationChecklist.tsx` | Actualizar checklist a Claude |
| `src/pages/digitization/OCRDetail.tsx` | Ya parcialmente limpio, verificar que no queden refs |

### Frontend - Hooks y lógica

| Archivo | Cambios |
|---------|---------|
| `src/hooks/useInvoicesReceived.ts` | Cambiar tipo `ocr_engine` a `'claude' | 'manual_review'`, eliminar `ocr_ms_openai` |
| `src/hooks/useInvoiceOCR.ts` | Ya limpio pero verificar |
| `src/lib/ocr-utils.ts` (si existe) | Eliminar `estimateOCRCost` con lógica openai/mindee |

### Frontend - Domain/tests

| Archivo | Cambios |
|---------|---------|
| `src/domain/invoicing/use-cases/__tests__/ApproveInvoice.test.ts` | Eliminar `ocrMsOpenai`, `ocrMsMindee` de mocks |
| `src/domain/invoicing/use-cases/__tests__/RejectInvoice.test.ts` | Igual |
| `src/lib/__tests__/ocr-utils.test.ts` | Reescribir para Claude |

### Backend - Edge functions

| Archivo | Cambios |
|---------|---------|
| `supabase/functions/_shared/ocr/types.ts` | Eliminar `OpenAIExtractionResult`, cambiar `ocr_engine` types |
| `supabase/functions/_shared/ocr/circuit-breaker.ts` | Simplificar para Claude |
| `supabase/functions/_shared/ocr/prompts.ts` | Mantener (ya tiene prompt de extracción) |
| `supabase/functions/_shared/ocr/validators.ts` | Mantener |
| `supabase/functions/save-supplier-template/index.ts` | Cambiar `preferred_ocr_engine` options |
| `supabase/functions/config.toml` | Eliminar `mindee-invoice-ocr` entry |

## Orden de ejecución

1. Eliminar archivos dead (Mindee hook, MindeeMetricsCard, mindee-invoice-ocr function, _shared/mindee/, openai-client, openai-adapter, orchestrator)
2. Limpiar tipos en `_shared/ocr/types.ts` y `useInvoicesReceived.ts`
3. Actualizar componentes UI (filtros, sidebar, debug badge, diálogos)
4. Actualizar tests
5. Limpiar `config.toml`

## Resultado

- Un solo motor OCR: **Claude Vision** via `claude-invoice-ocr`
- Un solo hook: `useClaudeInvoiceOCR`
- Cero referencias a Mindee, OpenAI, Gemini o Google Vision
- UI muestra solo "Claude Vision" como motor

