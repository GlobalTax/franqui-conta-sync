-- ============================================================================
-- Añadir DEFAULT a columna state en ocr_circuit_breaker
-- Previene errores de NULL constraint en INSERTs incompletos
-- ============================================================================

-- Añadir default 'closed' para prevenir errores futuros
ALTER TABLE public.ocr_circuit_breaker 
ALTER COLUMN state SET DEFAULT 'closed';

-- Comentario para documentación
COMMENT ON COLUMN public.ocr_circuit_breaker.state IS 
'Estado del circuit breaker (closed=operativo, open=fallando, half_open=probando). Default: closed';
