-- Add job_id column to invoices_received for webhook correlation
ALTER TABLE public.invoices_received 
  ADD COLUMN IF NOT EXISTS job_id TEXT;

-- Index for fast webhook lookups by job_id
CREATE INDEX IF NOT EXISTS idx_invoices_received_job_id 
  ON public.invoices_received(job_id) 
  WHERE job_id IS NOT NULL;

-- Ensure job_id uniqueness (prevent duplicate webhook processing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_received_job_id_unique
  ON public.invoices_received(job_id)
  WHERE job_id IS NOT NULL;

COMMENT ON COLUMN public.invoices_received.job_id IS 
  'Mindee async job ID for webhook correlation and idempotency';