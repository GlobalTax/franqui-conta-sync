// ============================================================================
// MINDEE CLIENT V4 - Enhanced with error handling, webhooks, and telemetry
// ============================================================================

import type { MindeeExtractionResult } from "./types.ts";
import { adaptMindeeV4ToStandard } from "./mindee-adapter.ts";

// ============================================================================
// Error handling
// ============================================================================

class MindeeError extends Error {
  constructor(
    message: string,
    public errorType: 'auth' | 'rate_limit' | 'timeout' | 'server_error',
    public statusCode?: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'MindeeError';
  }
}

// ============================================================================
// Configuration
// ============================================================================

const MINDEE_TIMEOUT_MS = 45_000; // 45s for large PDFs
const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 3_000; // 3s between polls

// ============================================================================
// Main extraction function with overloads
// ============================================================================

export interface MindeeOptions {
  webhook_url?: string;
  wait_for_result?: boolean; // If false and job enqueued, returns { job_id }
  
  // ✨ Advanced inference parameters (Mindee V4)
  rag?: boolean;              // Boost accuracy with Retrieval-Augmented Generation
  raw_text?: boolean;         // Extract full text content as strings
  polygon?: boolean;          // Calculate bounding box polygons for all fields
  confidence?: boolean;       // Enhanced confidence scores (default: true)
}

// When wait_for_result is explicitly false, may return job_id
export async function extractWithMindee(
  input: Blob | Uint8Array | string,
  options: MindeeOptions & { wait_for_result: false }
): Promise<MindeeExtractionResult | { job_id: string }>;

// Otherwise, always returns full result
export async function extractWithMindee(
  input: Blob | Uint8Array | string,
  options?: Omit<MindeeOptions, 'wait_for_result'> | (MindeeOptions & { wait_for_result?: true })
): Promise<MindeeExtractionResult>;

// Implementation
export async function extractWithMindee(
  input: Blob | Uint8Array | string,
  options?: MindeeOptions
): Promise<MindeeExtractionResult | { job_id: string }> {
  const startTime = Date.now();
  
  const rawKey = Deno.env.get('MINDEE_API_KEY');
  if (!rawKey) {
    throw new MindeeError('MINDEE_API_KEY not configured', 'auth');
  }

  // 🔑 Robust API key normalization
  // Remove quotes, extra spaces, and detect Token/Bearer prefixes
  const normalizedKey = rawKey.trim()
    .replace(/^['"]|['"]$/g, '')  // Remove surrounding quotes
    .replace(/^\s*(Token|Bearer)\s+/i, '');  // Remove prefixes if present
  
  // Build proper Authorization header
  const authHeader = (/^(Token|Bearer)\s+/i.test(rawKey.trim()))
    ? rawKey.trim().replace(/^['"]|['"]$/g, '')  // Keep original if already has prefix
    : `Token ${normalizedKey}`;  // Add Token prefix if missing

  // 🔍 Security logging: show fingerprint without exposing full key
  console.log('[Mindee V4] 🔑 API key fingerprint:', `${normalizedKey.slice(0,4)}…${normalizedKey.slice(-4)} (len:${normalizedKey.length})`);
  
  if (!normalizedKey || normalizedKey.length < 10) {
    throw new MindeeError('MINDEE_API_KEY appears to be invalid or too short', 'auth');
  }

  console.log('[Mindee V4] Starting extraction...');
  console.log('[Mindee V4] Webhook:', options?.webhook_url ? 'enabled' : 'disabled');

  // ✅ FASE 5: Unificar input usando new File()
  let fileBytes: Uint8Array;
  
  if (input instanceof Blob) {
    fileBytes = new Uint8Array(await input.arrayBuffer());
    console.log('[Mindee V4] Using Blob input');
  } else if (input instanceof Uint8Array) {
    fileBytes = input;
    console.log('[Mindee V4] Using Uint8Array input');
  } else {
    // base64 string
    const base64Data = input.replace(/^data:.*?;base64,/, '');
    const binaryString = atob(base64Data);
    fileBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      fileBytes[i] = binaryString.charCodeAt(i);
    }
    console.log('[Mindee V4] Converted base64 to Uint8Array');
  }

  // ✅ FASE 5: Create Blob using unified bytes (Deno-safe ArrayBuffer)
  const formData = new FormData();
  // Create a clean ArrayBuffer for Deno compatibility
  const buffer = new ArrayBuffer(fileBytes.length);
  const view = new Uint8Array(buffer);
  view.set(fileBytes);
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('document', blob, 'invoice.pdf');
  
  // ✅ FASE 3: Webhook support
  if (options?.webhook_url) {
    formData.append('webhook', options.webhook_url);
    console.log('[Mindee V4] Webhook URL added to request');
  }

  // ✅ Build API URL with query parameters
  const baseUrl = 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';
  const apiUrl = new URL(baseUrl);

  // ✨ Add advanced inference parameters
  if (options?.rag) {
    apiUrl.searchParams.set('rag', 'true');
    console.log('[Mindee V4] RAG enabled for enhanced accuracy');
  }
  if (options?.raw_text) {
    apiUrl.searchParams.set('raw_text', 'true');
    console.log('[Mindee V4] Raw text extraction enabled');
  }
  if (options?.polygon) {
    apiUrl.searchParams.set('polygon', 'true');
    console.log('[Mindee V4] Polygon bounding boxes enabled');
  }
  // Confidence is true by default in Mindee V4, but can be disabled
  if (options?.confidence === false) {
    apiUrl.searchParams.set('confidence', 'false');
  } else {
    apiUrl.searchParams.set('confidence', 'true');
  }
  
  console.log('[Mindee V4] Calling API:', apiUrl.toString());
  
  // ✅ FASE 2: Timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MINDEE_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': authHeader
        // NO incluir Content-Type, el browser lo agrega automáticamente con boundary
      },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // ✅ FASE 1: Enhanced error handling with classification
    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText };
      }
      console.error('[Mindee V4] API error:', response.status, errorData);
      
      if (response.status === 401 || response.status === 403) {
        throw new MindeeError(
          'Mindee API key inválida. Verifica MINDEE_API_KEY en Supabase secrets.',
          'auth',
          response.status,
          errorText
        );
      }
      
      if (response.status === 413) {
        throw new MindeeError(
          'PDF demasiado grande para Mindee (max ~25MB).',
          'server_error',
          413,
          errorText
        );
      }
      
      if (response.status === 422) {
        const detail = errorData?.api_request?.error?.message || 
                      errorData?.error?.detail || 
                      errorData?.detail || 
                      'Error de validación';
        throw new MindeeError(
          `Mindee no pudo procesar el documento (422): ${detail}`,
          'server_error',
          422,
          detail
        );
      }
      
      if (response.status === 429) {
        throw new MindeeError(
          'Mindee rate limit exceeded',
          'rate_limit',
          429,
          errorText
        );
      }
      
      throw new MindeeError(
        `Mindee V4 API error: ${response.status}`,
        'server_error',
        response.status,
        errorText
      );
    }

    const result = await response.json();
    const durationMs = Date.now() - startTime;
    console.log('[Mindee V4] API response received in', durationMs, 'ms');
    
    // ✅ FASE 3: Check if job was enqueued (async processing)
    if (result.job && result.job.id) {
      const jobId = result.job.id;
      console.log(`[Mindee V4] Job enqueued: ${jobId}`);
      
      // If caller doesn't want to wait, return job_id immediately
      if (options?.wait_for_result === false) {
        return { job_id: jobId };
      }
      
      // If no webhook, poll for result
      if (!options?.webhook_url) {
        console.log('[Mindee V4] Starting polling for job result...');
        return await pollMindeeJob(jobId, normalizedKey, startTime);
      }
      
      // If webhook configured, return immediately
      // (webhook will trigger later with result)
      return { job_id: jobId };
    }
    
    // Validar estructura de respuesta V4 síncrona
    if (!result.document || !result.document.inference) {
      console.error('[Mindee V4] Invalid response structure:', JSON.stringify(result, null, 2));
      throw new MindeeError(
        'Invalid Mindee V4 response structure',
        'server_error',
        undefined,
        'Missing document.inference in response'
      );
    }

    console.log('[Mindee V4] Extraction completed successfully');

    // ✅ FASE 4: Add telemetry
    const adapted = adaptMindeeV4ToStandard(result);
    return {
      ...adapted,
      timing: {
        duration_ms: durationMs,
        api_latency: durationMs
      }
    };

  } catch (error) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    
    // ✅ FASE 1: Classify timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Mindee V4] Request timed out after ${durationMs}ms`);
      throw new MindeeError(
        `Mindee request timed out after ${MINDEE_TIMEOUT_MS}ms`,
        'timeout',
        undefined,
        `Request exceeded timeout (${durationMs}ms)`
      );
    }
    
    console.error(`[Mindee V4] Failed after ${durationMs}ms:`, error);
    throw error;
  }
}

// ============================================================================
// FASE 3: Polling function for async jobs
// ============================================================================

async function pollMindeeJob(
  jobId: string,
  apiKey: string,
  startTime: number
): Promise<MindeeExtractionResult> {
  
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    console.log(`[Mindee Polling] Attempt ${attempt}/${MAX_POLL_ATTEMPTS}...`);
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    
    try {
      const statusResponse = await fetch(
        `https://api.mindee.net/v1/products/mindee/invoices/v4/documents/${jobId}`,
        {
          headers: {
            'Authorization': `Token ${apiKey}`
          }
        }
      );
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('[Mindee Polling] Error fetching job status:', statusResponse.status, errorText);
        
        if (statusResponse.status === 404) {
          console.warn('[Mindee Polling] Job not found, will retry...');
          continue;
        }
        
        throw new MindeeError(
          'Failed to fetch Mindee job status',
          'server_error',
          statusResponse.status,
          errorText
        );
      }
      
      const statusData = await statusResponse.json();
      
      // Check if job completed successfully
      if (statusData.document?.inference?.prediction) {
        const durationMs = Date.now() - startTime;
        console.log(`[Mindee Polling] Job completed successfully in ${durationMs}ms`);
        
        const adapted = adaptMindeeV4ToStandard(statusData);
        return {
          ...adapted,
          timing: {
            duration_ms: durationMs,
            api_latency: durationMs
          }
        };
      }
      
      // Check if job failed
      if (statusData.job?.status === 'failure') {
        const errorDetail = JSON.stringify(statusData.job.error || 'Unknown error');
        console.error('[Mindee Polling] Job failed:', errorDetail);
        throw new MindeeError(
          'Mindee job processing failed',
          'server_error',
          undefined,
          errorDetail
        );
      }
      
      // Job still processing, continue polling
      console.log(`[Mindee Polling] Job status: ${statusData.job?.status || 'processing'}`);
      
    } catch (error) {
      if (error instanceof MindeeError) {
        throw error;
      }
      console.error('[Mindee Polling] Error during polling:', error);
      // Continue polling unless it's the last attempt
      if (attempt === MAX_POLL_ATTEMPTS) {
        throw error;
      }
    }
  }
  
  // Polling timed out
  const durationMs = Date.now() - startTime;
  console.error(`[Mindee Polling] Timed out after ${durationMs}ms`);
  throw new MindeeError(
    `Mindee job polling timed out after ${MAX_POLL_ATTEMPTS} attempts`,
    'timeout',
    undefined,
    `Polling exceeded max attempts (${durationMs}ms total)`
  );
}
