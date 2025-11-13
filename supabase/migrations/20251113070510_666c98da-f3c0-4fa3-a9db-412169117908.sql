-- Create function to reset OCR circuit breaker (without logging)
CREATE OR REPLACE FUNCTION public.reset_ocr_circuit_breaker(p_engine TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_state TEXT;
BEGIN
  -- Get old state
  SELECT state INTO v_old_state
  FROM public.ocr_circuit_breaker
  WHERE engine = p_engine;
  
  -- Reset circuit breaker
  UPDATE public.ocr_circuit_breaker 
  SET 
    state = 'closed',
    failure_count = 0,
    last_failure_at = NULL,
    next_retry_at = NULL,
    error_type = NULL,
    updated_at = NOW()
  WHERE engine = p_engine;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'engine', p_engine,
    'old_state', v_old_state,
    'new_state', 'closed',
    'reset_at', NOW()
  );
END;
$function$;

-- Reset Mindee circuit breaker now
SELECT reset_ocr_circuit_breaker('mindee');