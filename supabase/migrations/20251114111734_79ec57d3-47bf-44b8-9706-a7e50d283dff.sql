-- ============================================================================
-- RESET OPENAI CIRCUIT BREAKER - Fix after malformed URL errors
-- ============================================================================
-- Purpose: Resetear el circuit breaker de OpenAI después de corregir el bug
--          de URLs malformadas (openai://file-file-XXX). Esto permite que el
--          sistema vuelva a intentar llamadas a OpenAI.
-- ============================================================================

UPDATE public.ocr_circuit_breaker 
SET 
  state = 'closed',
  failure_count = 0,
  last_failure_at = NULL,
  next_retry_at = NULL,
  error_type = NULL,
  updated_at = NOW()
WHERE engine = 'openai';

-- Verificar resultado
SELECT 
  engine,
  state,
  failure_count,
  last_failure_at,
  last_success_at,
  error_type
FROM public.ocr_circuit_breaker 
WHERE engine = 'openai';