-- ============================================================================
-- Migration: Create OCR Tracking Tables (Schema Original)
-- Purpose: Trazabilidad completa de OCR (runs, logs, webhook idempotency)
-- ============================================================================

-- ===================
-- 1. OCR_RUNS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS public.ocr_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices_received(id) ON DELETE CASCADE,
  engine TEXT NOT NULL CHECK (engine IN ('openai', 'mindee')),
  duration_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  pages INTEGER DEFAULT 1,
  cost_estimate_eur NUMERIC(10, 4),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_runs_invoice_id ON public.ocr_runs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ocr_runs_engine ON public.ocr_runs(engine);
CREATE INDEX IF NOT EXISTS idx_ocr_runs_created_at ON public.ocr_runs(created_at DESC);

ALTER TABLE public.ocr_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all ocr_runs"
  ON public.ocr_runs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view ocr_runs for accessible centres"
  ON public.ocr_runs FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices_received 
      WHERE centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert ocr_runs"
  ON public.ocr_runs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.ocr_runs IS 'Trazabilidad de ejecuciones OCR: métricas, costes, latencia';

-- ===================
-- 2. OCR_LOGS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS public.ocr_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices_received(id) ON DELETE CASCADE,
  engine TEXT,
  event TEXT NOT NULL CHECK (event IN ('upload', 'execute', 'fallback', 'webhook', 'error')),
  message TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_logs_invoice_id ON public.ocr_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ocr_logs_engine ON public.ocr_logs(engine);
CREATE INDEX IF NOT EXISTS idx_ocr_logs_event ON public.ocr_logs(event);
CREATE INDEX IF NOT EXISTS idx_ocr_logs_created_at ON public.ocr_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_logs_error ON public.ocr_logs(event) WHERE event = 'error';

ALTER TABLE public.ocr_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all ocr_logs"
  ON public.ocr_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view ocr_logs for accessible centres"
  ON public.ocr_logs FOR SELECT
  USING (
    invoice_id IS NULL OR invoice_id IN (
      SELECT id FROM public.invoices_received 
      WHERE centro_code IN (
        SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert ocr_logs"
  ON public.ocr_logs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.ocr_logs IS 'Logs estructurados de eventos OCR';

-- ===============================
-- 3. OCR_WEBHOOK_DELIVERIES TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS public.ocr_webhook_deliveries (
  job_id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  headers JSONB DEFAULT '{}'::jsonb,
  body JSONB DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN,
  status TEXT NOT NULL CHECK (status IN ('received', 'processing', 'completed', 'failed')) DEFAULT 'received'
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_received_at ON public.ocr_webhook_deliveries(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.ocr_webhook_deliveries(status);

ALTER TABLE public.ocr_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all webhook deliveries"
  ON public.ocr_webhook_deliveries FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage webhook deliveries"
  ON public.ocr_webhook_deliveries FOR ALL
  USING (true);

COMMENT ON TABLE public.ocr_webhook_deliveries IS 'Idempotencia de webhooks Mindee';

-- ===================
-- 4. HELPER FUNCTIONS
-- ===================
CREATE OR REPLACE FUNCTION public.log_ocr_event(
  p_invoice_id UUID,
  p_engine TEXT,
  p_event TEXT,
  p_message TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.ocr_logs (invoice_id, engine, event, message, meta)
  VALUES (p_invoice_id, p_engine, p_event, p_message, p_meta)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- ===================
-- 5. VIEWS
-- ===================
CREATE OR REPLACE VIEW public.v_ocr_metrics AS
SELECT
  ir.centro_code,
  ir.status AS invoice_status,
  COUNT(DISTINCT ir.id) AS total_invoices,
  AVG(ir.ocr_confidence) AS avg_confidence,
  COUNT(DISTINCT CASE WHEN ir.status = 'pending_ocr' THEN ir.id END) AS pending_count,
  COUNT(DISTINCT ocr.id) AS total_runs,
  AVG(ocr.duration_ms) AS avg_duration_ms,
  SUM(ocr.cost_estimate_eur) AS total_cost_eur,
  COUNT(DISTINCT logs.id) FILTER (WHERE logs.event = 'error') AS error_count
FROM public.invoices_received ir
LEFT JOIN public.ocr_runs ocr ON ocr.invoice_id = ir.id
LEFT JOIN public.ocr_logs logs ON logs.invoice_id = ir.id
GROUP BY ir.centro_code, ir.status;

-- ===================
-- 6. GRANTS
-- ===================
GRANT SELECT ON public.ocr_runs TO authenticated;
GRANT SELECT ON public.ocr_logs TO authenticated;
GRANT SELECT ON public.ocr_webhook_deliveries TO authenticated;
GRANT SELECT ON public.v_ocr_metrics TO authenticated;
GRANT INSERT ON public.ocr_runs TO service_role;
GRANT INSERT ON public.ocr_logs TO service_role;
GRANT INSERT, UPDATE ON public.ocr_webhook_deliveries TO service_role;
GRANT EXECUTE ON FUNCTION public.log_ocr_event TO service_role;
GRANT EXECUTE ON FUNCTION public.log_ocr_event TO authenticated;