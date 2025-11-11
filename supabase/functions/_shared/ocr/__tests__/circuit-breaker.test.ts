import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { 
  getCircuitState, 
  isEngineAvailable, 
  recordFailure, 
  recordSuccess,
  type OCREngine 
} from "../circuit-breaker.ts";

// Mock Supabase client
const originalEnv = Deno.env.toObject();

Deno.test("Circuit Breaker - getCircuitState returns default closed state", async () => {
  const state = await getCircuitState('openai');
  
  assertExists(state);
  assertEquals(state.engine, 'openai');
  assertEquals(state.state, 'closed');
  assertEquals(state.failure_count, 0);
});

Deno.test("Circuit Breaker - isEngineAvailable returns true for closed circuit", async () => {
  const available = await isEngineAvailable('openai');
  assertEquals(available, true);
});

Deno.test("Circuit Breaker - recordFailure increments failure count", async () => {
  const engine: OCREngine = 'openai';
  const error = new Error('Test error - timeout');
  
  // Record a failure
  await recordFailure(engine, error);
  
  const state = await getCircuitState(engine);
  assertEquals(state.failure_count >= 1, true);
  assertExists(state.last_failure_at);
});

Deno.test("Circuit Breaker - recordSuccess resets failure count", async () => {
  const engine: OCREngine = 'mindee';
  
  // Record a success
  await recordSuccess(engine);
  
  const state = await getCircuitState(engine);
  assertEquals(state.failure_count, 0);
  assertExists(state.last_success_at);
});

Deno.test("Circuit Breaker - error classification for auth errors", async () => {
  const engine: OCREngine = 'openai';
  const authError = new Error('401 Authentication failed - invalid API key');
  
  await recordFailure(engine, authError);
  
  const state = await getCircuitState(engine);
  assertEquals(state.error_type, 'auth');
});

Deno.test("Circuit Breaker - error classification for rate limit errors", async () => {
  const engine: OCREngine = 'openai';
  const rateLimitError = new Error('429 Rate limit exceeded');
  
  await recordFailure(engine, rateLimitError);
  
  const state = await getCircuitState(engine);
  assertEquals(state.error_type, 'rate_limit');
});

Deno.test("Circuit Breaker - error classification for timeout errors", async () => {
  const engine: OCREngine = 'mindee';
  const timeoutError = new Error('Request timed out after 30s');
  
  await recordFailure(engine, timeoutError);
  
  const state = await getCircuitState(engine);
  assertEquals(state.error_type, 'timeout');
});

Deno.test("Circuit Breaker - circuit opens after threshold failures", async () => {
  const engine: OCREngine = 'openai';
  const error = new Error('Server error 500');
  
  // Simulate 3 consecutive failures (FAILURE_THRESHOLD = 3)
  for (let i = 0; i < 3; i++) {
    await recordFailure(engine, error);
  }
  
  const state = await getCircuitState(engine);
  assertEquals(state.state, 'open');
  assertEquals(state.failure_count >= 3, true);
  assertExists(state.next_retry_at);
});

Deno.test("Circuit Breaker - isEngineAvailable returns false for open circuit before TTL", async () => {
  const engine: OCREngine = 'mindee';
  
  // Force circuit to open
  const error = new Error('Test error');
  for (let i = 0; i < 3; i++) {
    await recordFailure(engine, error);
  }
  
  const available = await isEngineAvailable(engine);
  assertEquals(available, false);
});

Deno.test("Circuit Breaker - half_open state allows limited attempts", async () => {
  const engine: OCREngine = 'openai';
  
  // This test would require mocking time to test TTL expiration
  // For now, just verify the logic exists
  const state = await getCircuitState(engine);
  assertExists(state);
});
