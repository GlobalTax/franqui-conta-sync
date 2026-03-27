

# Plan: Rebuild Digitization Module OCR Integration

## Root Cause Analysis

The module is broken because of a **response format mismatch** between the Claude edge function and what the frontend expects. There are also extensive legacy references to Mindee/OpenAI/Google Vision that create confusion.

### Critical Issues Found

1. **Response format mismatch (MAIN BUG)**: The `claude-invoice-ocr` edge function returns a flat response:
   ```
   { success, invoice_id, ocr_engine, ocr_confidence, ocr_cost_euros, ... }
   ```
   But `InvoiceDetailEditor.tsx` (line 446-554) expects `OCRResponse` with:
   ```
   { confidence, data, normalized, ap_mapping, entry_validation, orchestrator_logs, processingTimeMs, ocr_metrics, ... }
   ```
   Result: OCR runs but **no data is populated into the form**.

2. **Engine state confusion**: `InvoiceDetailEditor` initializes `ocrEngine` as `"google_vision"` (line 124), persists `"openai"` in localStorage (lines 199-213), and uses `engine: 'openai'` in all button handlers. But the actual engine is Claude.

3. **OCRDetail.tsx still uses Mindee**: Shows `MindeeMetricsCard` (line 99-107), button says "Reprocesar con Mindee" (line 128).

4. **Dead OCR types**: `OCRResponse` interface in `useInvoiceOCR.ts` has `mindee_metadata`, `ms_mindee`, engine types `"openai" | "mindee" | "merged"` -- none of which exist anymore.

5. **1574-line monolith**: `InvoiceDetailEditor.tsx` is extremely bloated with duplicated mobile/desktop layouts, dead code, and mixed concerns.

## Plan

### Phase 1: Fix the Claude Edge Function Response
**File**: `supabase/functions/claude-invoice-ocr/index.ts`

Expand the response to include the fields the frontend needs:
- Return `confidence` (0-1 scale), `data` (raw extracted), `normalized` (after fiscal pipeline)
- Return `ap_mapping` stub (invoice_level + line_level) 
- Return `processingTimeMs`, `ocr_metrics` (tokens, cost, pages)
- Return `validation` with ok/errors/warnings
- Remove legacy Mindee response structure

### Phase 2: Clean Up Frontend Types & Hook
**File**: `src/hooks/useInvoiceOCR.ts`

- Remove all Mindee/OpenAI references from `OCRResponse` interface
- Update engine type to `"claude"`
- Clean up `useProcessInvoiceOCR` logging to say "Claude" not "OpenAI"
- Remove `mindee_metadata` from `OCRResponse`

### Phase 3: Fix InvoiceDetailEditor OCR Flow
**File**: `src/pages/invoices/InvoiceDetailEditor.tsx`

- Change `ocrEngine` default from `"google_vision"` to `"claude"`
- Remove all localStorage engine persistence (no engine switching needed)
- Remove `selectedEngine` state (always Claude)
- Remove `handleRetryWithDifferentEngine` (dead code)
- Update all `engine: 'openai'` references to remove engine parameter
- Fix response mapping in `handleProcessOCR` to match new Claude response format

### Phase 4: Fix OCRDetail.tsx 
**File**: `src/pages/digitization/OCRDetail.tsx`

- Replace `MindeeMetricsCard` with Claude metrics (confidence, cost, tokens)
- Change button text from "Reprocesar con Mindee" to "Reprocesar con Claude"

### Phase 5: Clean Up Engine Indicator
**File**: `src/components/invoices/OCREngineIndicator.tsx` (if exists)

- Update to show "Claude Vision" as the engine
- Remove OpenAI/Mindee/Google Vision display logic

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/claude-invoice-ocr/index.ts` | Expand response to include `data`, `normalized`, `confidence` (0-1), `ap_mapping` stub, `processingTimeMs`, `ocr_metrics` |
| `src/hooks/useInvoiceOCR.ts` | Clean types, remove Mindee/OpenAI references, fix engine type |
| `src/pages/invoices/InvoiceDetailEditor.tsx` | Remove engine switching, fix response mapping, default to `"claude"` |
| `src/pages/digitization/OCRDetail.tsx` | Replace MindeeMetricsCard, fix button text |

## Expected Outcome

After these changes:
1. Upload PDF in "Nueva" tab -> Claude processes -> form auto-populates with extracted data
2. All UI consistently shows "Claude" as the OCR engine
3. No dead references to Mindee/OpenAI/Google Vision
4. Response format between edge function and frontend is aligned

