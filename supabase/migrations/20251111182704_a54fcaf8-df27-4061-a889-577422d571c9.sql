-- ============================================================================
-- OCR CIRCUIT BREAKER - Estado persistente para resilience pattern
-- ============================================================================

-- Tabla de estado de circuit breaker
CREATE TABLE IF NOT EXISTS public.ocr_circuit_breaker (
  engine TEXT PRIMARY KEY CHECK (engine IN ('openai', 'mindee')),
  state TEXT NOT NULL CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_type TEXT CHECK (error_type IN ('auth', 'rate_limit', 'timeout', 'server_error')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para queries por estado
CREATE INDEX idx_ocr_circuit_breaker_state ON public.ocr_circuit_breaker(state);

-- RLS policies
ALTER TABLE public.ocr_circuit_breaker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view circuit breaker state"
  ON public.ocr_circuit_breaker FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage circuit breaker"
  ON public.ocr_circuit_breaker FOR ALL
  USING (auth.role() = 'service_role');

-- Seed inicial (ambos circuitos cerrados)
INSERT INTO public.ocr_circuit_breaker (engine, state, failure_count)
VALUES 
  ('openai', 'closed', 0),
  ('mindee', 'closed', 0)
ON CONFLICT (engine) DO NOTHING;

-- Grants
GRANT SELECT ON public.ocr_circuit_breaker TO authenticated;
GRANT ALL ON public.ocr_circuit_breaker TO service_role;