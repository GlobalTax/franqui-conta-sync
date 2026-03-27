

# Plan: Fix Edge Function Column Mismatch

## Problem

The `claude-invoice-ocr` edge function fails with `Could not find the 'autofix_applied' column` because it writes to **14 columns that don't exist** on `invoices_received`. Additionally, the `ocr_engine` CHECK constraint doesn't allow `'claude'`.

## Database Changes (SQL Migration)

### 1. Add missing columns

```sql
ALTER TABLE public.invoices_received
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_tax_id TEXT,
ADD COLUMN IF NOT EXISTS base_imponible_10 NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS cuota_iva_10 NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS base_imponible_21 NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS cuota_iva_21 NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS ocr_raw_response JSONB,
ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_errors JSONB,
ADD COLUMN IF NOT EXISTS autofix_applied TEXT[],
ADD COLUMN IF NOT EXISTS ocr_cost_eur NUMERIC(10,6);
```

### 2. Fix `ocr_engine` CHECK constraint to allow `'claude'`

```sql
ALTER TABLE public.invoices_received DROP CONSTRAINT invoices_received_ocr_engine_check;
ALTER TABLE public.invoices_received ADD CONSTRAINT invoices_received_ocr_engine_check 
  CHECK (ocr_engine IN ('openai', 'merged', 'manual_review', 'claude'));
```

### 3. Fix edge function column name for confidence_notes

The column exists as `ocr_confidence_notes` (type `TEXT[]`), but the edge function writes `confidence_notes`. Fix this in the edge function.

## Edge Function Change

**File:** `supabase/functions/claude-invoice-ocr/index.ts` (line ~256)

Change `confidence_notes` → `ocr_confidence_notes` in the update payload.

## Summary

| Action | Detail |
|--------|--------|
| Add 12 columns to `invoices_received` | customer_name, customer_tax_id, base_imponible_10/21, cuota_iva_10/21, document_type, ocr_raw_response, ocr_processed_at, validation_errors, autofix_applied, ocr_cost_eur |
| Update CHECK constraint | Allow `'claude'` in `ocr_engine` |
| Fix edge function | `confidence_notes` → `ocr_confidence_notes` |
| Redeploy | `claude-invoice-ocr` |

