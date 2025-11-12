// ============================================================================
// OCR CIRCUIT BREAKER - Resilience pattern con state store en Supabase
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export type OCREngine = 'openai' | 'mindee';
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
  } else {
    // Reset failure count
    await updateCircuitState(engine, {
      failure_count: 0,
      last_success_at: new Date().toISOString()
    });
  }
}

/**
 * Registrar fallo de un engine
 */
export async function recordFailure(
  engine: OCREngine,
  error: Error,
  invoiceId?: string
): Promise<void> {
  const state = await getCircuitState(engine);
  const errorType = classifyError(error);
  const failureCount = state.failure_count + 1;
  
  console.log(`[CircuitBreaker] ${engine} failure #${failureCount}: ${errorType}`);
  
  // Determinar si abrir el circuito
  if (failureCount >= FAILURE_THRESHOLD) {
    const timeout = ERROR_TIMEOUTS[errorType] || ERROR_TIMEOUTS.unknown;
    const nextRetryAt = new Date(Date.now() + timeout);
    
    await updateCircuitState(engine, {
      state: 'open',
      failure_count: failureCount,
      last_failure_at: new Date().toISOString(),
      next_retry_at: nextRetryAt.toISOString(),
      error_type: errorType
    });
    
    console.log(`[CircuitBreaker] ${engine} circuit OPENED (retry at ${nextRetryAt.toISOString()})`);
    
    // Log en ocr_logs
    await logCircuitEvent(
      engine,
      'circuit_opened',
      `Circuit breaker opened after ${failureCount} failures (${errorType})`,
      invoiceId,
      { error: error.message, next_retry_at: nextRetryAt.toISOString() }
    );
  } else {
    await updateCircuitState(engine, {
      failure_count: failureCount,
      last_failure_at: new Date().toISOString(),
      error_type: errorType
    });
    
    // Log parcial
    await logCircuitEvent(
      engine,
      'failure_recorded',
      `Failure #${failureCount}/${FAILURE_THRESHOLD} (${errorType})`,
      invoiceId,
      { error: error.message }
    );
  }
}

/**
 * Clasificar error para determinar TTL
 */
function classifyError(error: Error): 'auth' | 'rate_limit' | 'timeout' | 'server_error' {
  const msg = error.message.toLowerCase();
  
  if (msg.includes('401') || msg.includes('authentication') || msg.includes('api key')) {
    return 'auth';
  }
  
  if (msg.includes('429') || msg.includes('rate limit')) {
    return 'rate_limit';
  }
  
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'timeout';
  }
  
  return 'server_error';
}

/**
 * Actualizar estado en Supabase (upsert)
 */
async function updateCircuitState(
  engine: OCREngine,
  updates: Partial<CircuitBreakerState>
): Promise<void> {
  // Get current state to ensure we always include required fields
  const currentState = await getCircuitState(engine);
  
  const { error } = await supabase
    .from('ocr_circuit_breaker')
    .upsert({
      engine,
      state: updates.state ?? currentState.state, // Always include state
      failure_count: updates.failure_count ?? currentState.failure_count,
      last_failure_at: updates.last_failure_at ?? currentState.last_failure_at,
      last_success_at: updates.last_success_at ?? currentState.last_success_at,
      next_retry_at: updates.next_retry_at ?? currentState.next_retry_at,
      error_type: updates.error_type ?? currentState.error_type,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'engine'
    });
  
  if (error) {
    console.error(`[CircuitBreaker] Failed to update state for ${engine}:`, error);
  }
}

/**
 * Loggear eventos de circuit breaker en ocr_logs
 */
async function logCircuitEvent(
  engine: OCREngine,
  event: string,
  message: string,
  invoiceId?: string,
  meta?: any
): Promise<void> {
  // Usar la función existente log_ocr_event si está disponible
  try {
    await supabase.rpc('log_ocr_event', {
      p_invoice_id: invoiceId || null,
      p_engine: engine,
      p_event: event,
      p_message: message,
      p_meta: meta || {}
    });
  } catch (error) {
    console.error(`[CircuitBreaker] Failed to log event:`, error);
  }
}

// ============================================================================
// HEALTH CHECKS (mejorados)
// ============================================================================

export async function probeOpenAI(): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return { ok: false, error: 'OPENAI_API_KEY not configured' };
    }
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000)  // 5s timeout
    });
    
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    }
    
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function probeMindee(): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = Deno.env.get('MINDEE_API_KEY');
    if (!apiKey) {
      return { ok: false, error: 'MINDEE_API_KEY not configured' };
    }
    
    const response = await fetch('https://api.mindee.net/v1/products/mindee/invoices/v4/openapi.json', {
      headers: { Authorization: `Token ${apiKey}` },
      signal: AbortSignal.timeout(5000)  // 5s timeout
    });
    
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    }
    
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
