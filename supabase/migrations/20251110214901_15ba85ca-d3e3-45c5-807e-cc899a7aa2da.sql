-- ============================================
-- Módulo: Subida Masiva de Facturas PDF con OCR
-- Objetivo: Agregar campos necesarios para tracking de uploads masivos
-- ============================================

-- Agregar campos faltantes a invoices_received
ALTER TABLE public.invoices_received
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,  -- Alias de document_path para compatibilidad
ADD COLUMN IF NOT EXISTS document_hash TEXT,  -- SHA-256 para deduplicación
ADD COLUMN IF NOT EXISTS ocr_engine TEXT CHECK (ocr_engine IN ('openai', 'mindee', 'merged', 'manual_review')),
ADD COLUMN IF NOT EXISTS ocr_payload JSONB DEFAULT '{}'::jsonb,  -- Datos completos del OCR
ADD COLUMN IF NOT EXISTS ocr_ms_openai INTEGER,  -- Tiempo procesamiento OpenAI
ADD COLUMN IF NOT EXISTS ocr_ms_mindee INTEGER,  -- Tiempo procesamiento Mindee
ADD COLUMN IF NOT EXISTS ocr_pages INTEGER,  -- Número de páginas procesadas
ADD COLUMN IF NOT EXISTS ocr_tokens_in INTEGER,  -- Tokens de entrada
ADD COLUMN IF NOT EXISTS ocr_tokens_out INTEGER,  -- Tokens de salida
ADD COLUMN IF NOT EXISTS ocr_cost_estimate_eur NUMERIC(10,4),  -- Coste estimado en EUR
ADD COLUMN IF NOT EXISTS ocr_processing_time_ms INTEGER,  -- Tiempo total de procesamiento
ADD COLUMN IF NOT EXISTS ocr_confidence_notes TEXT[],  -- Notas sobre la confianza
ADD COLUMN IF NOT EXISTS ocr_merge_notes TEXT[],  -- Notas sobre merge OpenAI+Mindee
ADD COLUMN IF NOT EXISTS ocr_extracted_data JSONB,  -- Datos normalizados extraídos
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),  -- Usuario que subió
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT now();  -- Timestamp de subida

-- Índices para mejorar performance en búsquedas
CREATE INDEX IF NOT EXISTS idx_invoices_received_document_hash 
  ON public.invoices_received(document_hash) 
  WHERE document_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_received_ocr_engine 
  ON public.invoices_received(ocr_engine) 
  WHERE ocr_engine IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_received_uploaded_by 
  ON public.invoices_received(uploaded_by) 
  WHERE uploaded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_received_uploaded_at 
  ON public.invoices_received(uploaded_at DESC) 
  WHERE uploaded_at IS NOT NULL;

-- Constraint: prevenir duplicados por hash + centro
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_received_unique_hash_centro 
  ON public.invoices_received(document_hash, centro_code) 
  WHERE document_hash IS NOT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN public.invoices_received.file_name IS 'Nombre original del archivo PDF subido';
COMMENT ON COLUMN public.invoices_received.file_path IS 'Ruta completa en storage (invoices/raw/{uuid}.pdf)';
COMMENT ON COLUMN public.invoices_received.document_hash IS 'SHA-256 hash del PDF para deduplicación';
COMMENT ON COLUMN public.invoices_received.ocr_engine IS 'Motor OCR utilizado: openai, mindee, merged, manual_review';
COMMENT ON COLUMN public.invoices_received.ocr_payload IS 'Payload completo devuelto por el sistema OCR';
COMMENT ON COLUMN public.invoices_received.ocr_cost_estimate_eur IS 'Coste estimado del procesamiento OCR en euros';
COMMENT ON COLUMN public.invoices_received.uploaded_by IS 'Usuario que realizó la carga del documento';
COMMENT ON COLUMN public.invoices_received.uploaded_at IS 'Timestamp de cuándo se subió el documento';

-- Copiar document_path a file_path para facturas existentes
UPDATE public.invoices_received 
SET file_path = document_path,
    uploaded_by = created_by,
    uploaded_at = created_at
WHERE file_path IS NULL AND document_path IS NOT NULL;