// ============================================================================
// OCR CIRCUIT BREAKER - Resilience pattern con state store en Supabase
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export type OCREngine = 'openai';
export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  engine: OCREngine;
  state: CircuitState;
  failure_count: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  next_retry_at: string | null;
  error_type: 'auth' | 'rate_limit' | 'timeout' | 'server_error' | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const FAILURE_THRESHOLD = 3;           // Fallos consecutivos para abrir circuito
const SUCCESS_THRESHOLD = 2;           // Éxitos para cerrar circuito
const HALF_OPEN_TIMEOUT = 60_000;      // 1 min para probar si se recuperó

// TTL dinámico según tipo de error
const ERROR_TIMEOUTS = {
  auth: 30 * 60_000,          // 30 min (problema de configuración)
  rate_limit: 5 * 60_000,     // 5 min (esperar reset de rate limit)
  timeout: 2 * 60_000,        // 2 min (transient)
  server_error: 1 * 60_000,   // 1 min (puede recuperarse rápido)
  unknown: 3 * 60_000         // 3 min (default)
};

// ============================================================================
// STATE MANAGEMENT (usando Supabase como state store distribuido)
// ============================================================================

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Obtener estado actual del circuit breaker para un engine
 */
export async function getCircuitState(engine: OCREngine): Promise<CircuitBreakerState> {
  const { data, error } = await supabase
    .from('ocr_circuit_breaker')
    .select('*')
    .eq('engine', engine)
    .single();

  if (error || !data) {
    // Default: circuito cerrado (healthy)
    return {
      engine,
      state: 'closed',
      failure_count: 0,
      last_failure_at: null,
      last_success_at: null,
      next_retry_at: null,
      error_type: null
    };
  }

  return data;
}

/**
 * Verificar si un engine está disponible
 */
export async function isEngineAvailable(engine: OCREngine): Promise<boolean> {
  const state = await getCircuitState(engine);
  
  // Si está cerrado, está disponible
  if (state.state === 'closed') {
    return true;
  }
  
  // Si está abierto, verificar si ya pasó el TTL
  if (state.state === 'open' && state.next_retry_at) {
    const now = new Date();
    const retryAt = new Date(state.next_retry_at);
    
    if (now >= retryAt) {
      // Pasar a half-open para probar
      await updateCircuitState(engine, { state: 'half_open' });
      return true;  // Permitir un intento
    }
    
    return false;  // Aún bloqueado
  }
  
  // Half-open: permitir intentos limitados
  return state.state === 'half_open';
}

/**
 * Registrar éxito de un engine
 */
export async function recordSuccess(engine: OCREngine, invoiceId?: string): Promise<void> {
  const state = await getCircuitState(engine);
  
  // Si estaba en half-open, cerrar el circuito
  if (state.state === 'half_open') {
    await updateCircuitState(engine, {
      state: 'closed',
      failure_count: 0,
      last_success_at: new Date().toISOString(),
      next_retry_at: null,
      error_type: null
    });
    
    console.log(`[CircuitBreaker] ${engine} circuit CLOSED (recovered)`);
    
    // Log en ocr_logs
    await logCircuitEvent(engine, 'circuit_closed', 'Circuit breaker closed after recovery', invoiceId);
    return;
  }
  
  // Simplemente actualizar last_success_at y cerrar circuito
  await updateCircuitState(engine, {
    state: 'closed',
    last_success_at: new Date().toISOString(),
    next_retry_at: null,
    error_type: null
  });
}

/**
 * Registrar fallo de un engine
 */
export async function recordFailure(
  engine: OCREngine,
  errorType: 'auth' | 'rate_limit' | 'timeout' | 'server_error',
  errorMessage?: string,
  invoiceId?: string
): Promise<void> {
  const state = await getCircuitState(engine);
  const newFailureCount = state.failure_count + 1;
  
  // Log del fallo
  await logCircuitEvent(engine, 'failure_recorded', `${errorType}: ${errorMessage}`, invoiceId);
  
  // Si alcanzamos el threshold, abrir el circuito
  if (newFailureCount >= FAILURE_THRESHOLD) {
    const timeout = ERROR_TIMEOUTS[errorType] || ERROR_TIMEOUTS.unknown;
    const nextRetry = new Date(Date.now() + timeout);
    
    await updateCircuitState(engine, {
      state: 'open',
      failure_count: newFailureCount,
      last_failure_at: new Date().toISOString(),
      next_retry_at: nextRetry.toISOString(),
      error_type: errorType
    });
    
    console.error(`[CircuitBreaker] ${engine} circuit OPENED after ${newFailureCount} failures (${errorType})`);
    console.error(`[CircuitBreaker] ${engine} will retry at ${nextRetry.toISOString()}`);
    
    // Log crítico
    await logCircuitEvent(
      engine, 
      'circuit_opened', 
      `Circuit opened after ${newFailureCount} failures. Next retry: ${nextRetry.toISOString()}`,
      invoiceId
    );
    
    return;
  }
  
  // Incrementar contador pero mantener circuito cerrado/half-open
  await updateCircuitState(engine, {
    state: state.state, // Mantener estado actual (crítico para upsert)
    failure_count: newFailureCount,
    last_failure_at: new Date().toISOString(),
    error_type: errorType
  });
  
  console.warn(`[CircuitBreaker] ${engine} failure ${newFailureCount}/${FAILURE_THRESHOLD} (${errorType})`);
}

/**
 * Actualizar estado del circuit breaker
 */
async function updateCircuitState(
  engine: OCREngine,
  updates: Partial<Omit<CircuitBreakerState, 'engine'>>
): Promise<void> {
  const { error } = await supabase
    .from('ocr_circuit_breaker')
    .upsert({
      engine,
      ...updates,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'engine'
    });

  if (error) {
    console.error(`[CircuitBreaker] Failed to update state for ${engine}:`, error);
  }
}

/**
 * Registrar evento en ocr_logs
 */
async function logCircuitEvent(
  engine: OCREngine,
  eventType: string,
  message: string,
  invoiceId?: string
): Promise<void> {
  try {
    await supabase.from('ocr_logs').insert({
      invoice_id: invoiceId || null,
      engine,
      event_type: eventType,
      message,
      metadata: { circuit_breaker: true },
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CircuitBreaker] Failed to log event:', error);
  }
}

/**
 * Resetear manualmente el circuit breaker (para admin/debugging)
 */
export async function resetCircuitBreaker(engine: OCREngine): Promise<void> {
  await updateCircuitState(engine, {
    state: 'closed',
    failure_count: 0,
    last_failure_at: null,
    next_retry_at: null,
    error_type: null
  });
  
  console.log(`[CircuitBreaker] ${engine} circuit manually reset to CLOSED`);
  await logCircuitEvent(engine, 'manual_reset', 'Circuit breaker manually reset by admin');
}
