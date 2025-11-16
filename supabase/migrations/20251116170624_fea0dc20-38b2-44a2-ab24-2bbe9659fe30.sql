-- ============================================================================
-- MIGRATION: Add Mindee OCR columns and critical supplier flag
-- Purpose: Soportar metadata de Mindee y sistema de revisión de proveedores críticos
-- ============================================================================

-- 1. Agregar columnas Mindee a invoices_received
ALTER TABLE public.invoices_received
  ADD COLUMN IF NOT EXISTS mindee_document_id TEXT,
  ADD COLUMN IF NOT EXISTS mindee_confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS mindee_processing_time NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS mindee_raw_response JSONB,
  ADD COLUMN IF NOT EXISTS mindee_cost_euros NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS mindee_pages INTEGER,
  ADD COLUMN IF NOT EXISTS ocr_engine TEXT DEFAULT 'mindee',
  ADD COLUMN IF NOT EXISTS ocr_fallback_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS field_confidence_scores JSONB;

-- 2. Agregar requires_manual_review a suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT false;

-- 3. Crear comentarios
COMMENT ON COLUMN public.invoices_received.mindee_document_id IS 'ID único del documento en Mindee API';
COMMENT ON COLUMN public.invoices_received.mindee_confidence IS 'Confianza global del OCR (0-100)';
COMMENT ON COLUMN public.invoices_received.mindee_processing_time IS 'Tiempo de procesamiento en Mindee (segundos)';
COMMENT ON COLUMN public.invoices_received.mindee_raw_response IS 'Respuesta completa de Mindee API (backup)';
COMMENT ON COLUMN public.invoices_received.mindee_cost_euros IS 'Coste de procesamiento en euros';
COMMENT ON COLUMN public.invoices_received.mindee_pages IS 'Número de páginas procesadas';
COMMENT ON COLUMN public.invoices_received.ocr_engine IS 'Motor OCR usado: mindee, openai, manual';
COMMENT ON COLUMN public.invoices_received.ocr_fallback_used IS 'TRUE si se usó fallback de OCR raw text';
COMMENT ON COLUMN public.invoices_received.field_confidence_scores IS 'Confidence por campo: {"invoice_number": 95, "total": 87}';
COMMENT ON COLUMN public.suppliers.requires_manual_review IS 'TRUE si facturas de este proveedor requieren revisión manual obligatoria';

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_invoices_received_mindee_document_id 
  ON public.invoices_received(mindee_document_id);

CREATE INDEX IF NOT EXISTS idx_invoices_received_ocr_engine 
  ON public.invoices_received(ocr_engine);

CREATE INDEX IF NOT EXISTS idx_suppliers_requires_manual_review 
  ON public.suppliers(requires_manual_review) 
  WHERE requires_manual_review = true;

-- 5. Marcar Havi Logistics como proveedor crítico
UPDATE public.suppliers
SET requires_manual_review = true
WHERE UPPER(name) LIKE '%HAVI%LOGISTICS%'
   OR UPPER(name) LIKE '%HAVI%';

-- 6. Crear vista de métricas Mindee
CREATE OR REPLACE VIEW public.v_mindee_metrics AS
SELECT
  COUNT(*) FILTER (WHERE ocr_engine = 'mindee') AS total_mindee,
  COUNT(*) FILTER (WHERE ocr_engine = 'openai') AS total_openai,
  AVG(mindee_confidence) FILTER (WHERE ocr_engine = 'mindee') AS avg_confidence,
  AVG(mindee_processing_time) FILTER (WHERE ocr_engine = 'mindee') AS avg_processing_time,
  SUM(mindee_cost_euros) FILTER (WHERE ocr_engine = 'mindee') AS total_cost,
  COUNT(*) FILTER (WHERE ocr_fallback_used = true) AS total_fallbacks,
  COUNT(*) FILTER (WHERE approval_status = 'ocr_review') AS total_needs_review,
  DATE_TRUNC('day', created_at) AS date
FROM public.invoices_received
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

COMMENT ON VIEW public.v_mindee_metrics IS 'Métricas diarias de procesamiento OCR (Mindee vs OpenAI)';