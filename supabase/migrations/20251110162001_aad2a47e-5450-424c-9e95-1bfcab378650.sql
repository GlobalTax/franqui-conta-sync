-- ============================================================================
-- ADD OCR METRICS FIELDS TO ocr_processing_log
-- Purpose: Tracking detallado de costes, tiempos por motor y tokens
-- ============================================================================

-- Añadir campos de métricas detalladas a ocr_processing_log
ALTER TABLE public.ocr_processing_log 
  ADD COLUMN IF NOT EXISTS engine TEXT CHECK (engine IN ('openai', 'mindee', 'merged', 'manual_review')),
  ADD COLUMN IF NOT EXISTS ms_openai INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_mindee INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pages INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tokens_in INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_out INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_estimate_eur NUMERIC(10, 4) DEFAULT 0;

-- Comentar campos para documentación
COMMENT ON COLUMN public.ocr_processing_log.engine IS 'Motor OCR usado: openai, mindee, merged, manual_review';
COMMENT ON COLUMN public.ocr_processing_log.ms_openai IS 'Tiempo de procesamiento OpenAI en milisegundos';
COMMENT ON COLUMN public.ocr_processing_log.ms_mindee IS 'Tiempo de procesamiento Mindee en milisegundos';
COMMENT ON COLUMN public.ocr_processing_log.pages IS 'Número de páginas del documento PDF';
COMMENT ON COLUMN public.ocr_processing_log.tokens_in IS 'Tokens de entrada (OpenAI)';
COMMENT ON COLUMN public.ocr_processing_log.tokens_out IS 'Tokens de salida (OpenAI)';
COMMENT ON COLUMN public.ocr_processing_log.cost_estimate_eur IS 'Coste estimado en EUR según tarifas actuales';

-- Índices para análisis de costes
CREATE INDEX IF NOT EXISTS idx_ocr_log_engine ON public.ocr_processing_log(engine);
CREATE INDEX IF NOT EXISTS idx_ocr_log_cost ON public.ocr_processing_log(cost_estimate_eur DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_log_created_at ON public.ocr_processing_log(created_at DESC);