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

ALTER TABLE public.invoices_received DROP CONSTRAINT IF EXISTS invoices_received_ocr_engine_check;
ALTER TABLE public.invoices_received ADD CONSTRAINT invoices_received_ocr_engine_check 
  CHECK (ocr_engine IN ('openai', 'merged', 'manual_review', 'claude'));