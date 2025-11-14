-- ============================================================================
-- Migration: Remove Mindee Fields and References
-- Purpose: Clean up all Mindee-related fields after switching to OpenAI-only
-- Date: 2025-11-14
-- ============================================================================

-- ============================================
-- 1. DROP WEBHOOK TABLE (Mindee-only)
-- ============================================
DROP TABLE IF EXISTS public.ocr_webhook_deliveries CASCADE;


-- ============================================
-- 2. CLEAN UP invoices_received
-- ============================================

-- Eliminar índices relacionados con job_id (Mindee)
DROP INDEX IF EXISTS public.idx_invoices_received_job_id;
DROP INDEX IF EXISTS public.idx_invoices_received_job_id_unique;

-- Eliminar columnas relacionadas con Mindee
ALTER TABLE public.invoices_received
  DROP COLUMN IF EXISTS ocr_ms_mindee,
  DROP COLUMN IF EXISTS job_id,
  DROP COLUMN IF EXISTS ocr_merge_notes;

-- Actualizar constraint de ocr_engine (eliminar 'mindee')
ALTER TABLE public.invoices_received
  DROP CONSTRAINT IF EXISTS invoices_received_ocr_engine_check;

ALTER TABLE public.invoices_received
  ADD CONSTRAINT invoices_received_ocr_engine_check
  CHECK (ocr_engine IN ('openai', 'merged', 'manual_review'));


-- ============================================
-- 3. CLEAN UP ocr_processing_log
-- ============================================

-- Eliminar columna ms_mindee
ALTER TABLE public.ocr_processing_log
  DROP COLUMN IF EXISTS ms_mindee;

-- Actualizar constraint de engine
ALTER TABLE public.ocr_processing_log
  DROP CONSTRAINT IF EXISTS ocr_processing_log_engine_check;

ALTER TABLE public.ocr_processing_log
  ADD CONSTRAINT ocr_processing_log_engine_check
  CHECK (engine IN ('openai', 'merged', 'manual_review'));


-- ============================================
-- 4. CLEAN UP ocr_runs
-- ============================================

-- Eliminar registros con engine='mindee'
DELETE FROM public.ocr_runs WHERE engine = 'mindee';

-- Actualizar constraint de engine
ALTER TABLE public.ocr_runs
  DROP CONSTRAINT IF EXISTS ocr_runs_engine_check;

ALTER TABLE public.ocr_runs
  ADD CONSTRAINT ocr_runs_engine_check
  CHECK (engine IN ('openai'));


-- ============================================
-- 5. CLEAN UP ocr_circuit_breaker
-- ============================================

-- Eliminar registro de Mindee
DELETE FROM public.ocr_circuit_breaker WHERE engine = 'mindee';

-- Actualizar constraint de engine
ALTER TABLE public.ocr_circuit_breaker
  DROP CONSTRAINT IF EXISTS ocr_circuit_breaker_engine_check;

ALTER TABLE public.ocr_circuit_breaker
  ADD CONSTRAINT ocr_circuit_breaker_engine_check
  CHECK (engine IN ('openai'));


-- ============================================
-- 6. ACTUALIZAR COMENTARIOS
-- ============================================

COMMENT ON COLUMN public.invoices_received.ocr_engine IS 
  'Motor OCR utilizado: openai, merged, manual_review';

COMMENT ON COLUMN public.ocr_processing_log.engine IS 
  'Motor OCR usado: openai, merged, manual_review';

COMMENT ON COLUMN public.ocr_runs.engine IS 
  'Motor OCR usado: openai';

COMMENT ON COLUMN public.ocr_circuit_breaker.engine IS 
  'Motor OCR monitoreado: openai';


-- ============================================
-- 7. LIMPIAR FUNCIÓN cleanup_old_data
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  logs_retention INTEGER;
  deleted_logs INTEGER;
BEGIN
  -- Obtener configuración de retención (solo logs)
  SELECT retention_logs_days
  INTO logs_retention
  FROM public.data_retention_settings
  LIMIT 1;

  -- Valor por defecto si no existe configuración
  IF logs_retention IS NULL THEN
    logs_retention := 90;
  END IF;

  -- Limpiar logs antiguos
  DELETE FROM public.app_logs
  WHERE created_at < (NOW() - (logs_retention || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_logs = ROW_COUNT;

  -- Log de limpieza (sin referencias a Mindee)
  INSERT INTO public.app_logs (level, message, source, function_name, meta)
  VALUES (
    'info', 
    'Cleanup job executed successfully', 
    'edge_function', 
    'cleanup_old_data',
    jsonb_build_object(
      'deleted_logs', deleted_logs,
      'logs_retention_days', logs_retention
    )
  );
END;
$function$;


-- ============================================
-- 8. VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

DO $$
DECLARE
  v_webhook_table_exists BOOLEAN;
  v_mindee_records INTEGER;
BEGIN
  -- Verificar que tabla webhook ya no existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ocr_webhook_deliveries'
  ) INTO v_webhook_table_exists;
  
  IF v_webhook_table_exists THEN
    RAISE WARNING 'Tabla ocr_webhook_deliveries aún existe';
  END IF;
  
  -- Verificar que no quedan registros con engine='mindee'
  SELECT COUNT(*) INTO v_mindee_records
  FROM ocr_runs WHERE engine = 'mindee';
  
  IF v_mindee_records > 0 THEN
    RAISE WARNING 'Aún existen % registros con engine=mindee en ocr_runs', v_mindee_records;
  END IF;
  
  RAISE NOTICE 'Limpieza de Mindee completada exitosamente';
END $$;