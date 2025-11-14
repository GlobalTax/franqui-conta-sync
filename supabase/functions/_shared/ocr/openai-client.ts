// ============================================================================
// OPENAI VISION CLIENT - Pure extraction logic with error classification
// ============================================================================

import type { OpenAIExtractionResult, DocumentType } from "./types.ts";
import { adaptOpenAIToStandard } from "./openai-adapter.ts";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODEL_CONFIGS: Record<string, { maxTokens: number; supportsVision: boolean; costPer1kTokens: number }> = {
  'gpt-4o': { maxTokens: 4096, supportsVision: true, costPer1kTokens: 0.005 },
  'gpt-4o-mini': { maxTokens: 2000, supportsVision: true, costPer1kTokens: 0.00015 },
  'gpt-4-turbo': { maxTokens: 4096, supportsVision: true, costPer1kTokens: 0.01 },
  'gpt-4-vision-preview': { maxTokens: 4096, supportsVision: true, costPer1kTokens: 0.01 }
};

const DEFAULT_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

// ============================================================================
// ERROR TYPES for Circuit Breaker integration
// ============================================================================

export class OpenAIError extends Error {
  public errorType: 'auth' | 'rate_limit' | 'quota' | 'timeout' | 'server_error';
  public detail?: string;
  public statusCode?: number;

  constructor(message: string, errorType: OpenAIError['errorType'], detail?: string, statusCode?: number) {
    super(message);
    this.name = 'OpenAIError';
    this.errorType = errorType;
    this.detail = detail;
    this.statusCode = statusCode;
  }
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

export async function extractWithOpenAI(
  base64Content: string,
  mimeType: string,
  documentType?: DocumentType,
  supplierHint?: string | null
): Promise<OpenAIExtractionResult> {
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new OpenAIError('OPENAI_API_KEY not configured', 'auth');
  }

  // Get model from env or use default
  const modelName = Deno.env.get('OCR_OPENAI_MODEL') || DEFAULT_MODEL;
  const modelConfig = MODEL_CONFIGS[modelName];

  if (!modelConfig) {
    throw new OpenAIError(`Unsupported OpenAI model: ${modelName}`, 'server_error');
  }

  if (!modelConfig.supportsVision) {
    throw new OpenAIError(`Model ${modelName} does not support vision`, 'server_error');
  }

  // Import schema utilities dynamically
  const { getInvoiceSchema, getSystemPrompt, detectSupplierType } = await import('./schemas/invoice-schema.ts');
  
  // Detect supplier type and get appropriate schema/prompt
  const supplierType = detectSupplierType(supplierHint);
  const jsonSchema = getInvoiceSchema(supplierType);
  const systemPrompt = getSystemPrompt(supplierType);

  console.log(`[OpenAI Vision] Starting extraction with model: ${modelName}`);
  console.log(`[OpenAI Vision] Supplier type: ${supplierType} (hint: ${supplierHint || 'none'})`);

  // Setup timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrae los datos de esta factura española:' },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:${mimeType};base64,${base64Content}`,
                  detail: 'high'
                } 
              }
            ]
          }
        ],
        response_format: { 
          type: 'json_schema',
          json_schema: {
            name: 'invoice_extraction',
            strict: true,
            schema: jsonSchema
          }
        },
        max_tokens: modelConfig.maxTokens,
        temperature: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Enhanced error handling with classification
    if (response.status === 429) {
      const errorBody = await response.text();
      console.error('[OpenAI Vision] Rate limit exceeded:', errorBody);
      throw new OpenAIError('OpenAI rate limit exceeded', 'rate_limit', errorBody, 429);
    }

    if (response.status === 401 || response.status === 403) {
      const errorBody = await response.text();
      console.error('[OpenAI Vision] Authentication failed:', errorBody);
      throw new OpenAIError('OpenAI authentication failed', 'auth', errorBody, response.status);
    }

    if (response.status === 402) {
      const errorBody = await response.text();
      console.error('[OpenAI Vision] Quota exceeded:', errorBody);
      throw new OpenAIError('OpenAI quota exceeded', 'quota', errorBody, 402);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Vision] API error:', response.status, errorText);
      throw new OpenAIError(
        `OpenAI Vision API error: ${response.status}`,
        response.status >= 500 ? 'server_error' : 'server_error',
        errorText,
        response.status
      );
    }

    const result = await response.json();

    console.log('[OpenAI Vision] Extraction completed, normalizing with adapter...');

    // Use adapter for normalization and validation
    return adaptOpenAIToStandard(result);

  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[OpenAI Vision] Request timeout');
      throw new OpenAIError('OpenAI Vision request timeout', 'timeout', `Request exceeded ${REQUEST_TIMEOUT_MS}ms`);
    }

    // Re-throw OpenAIError as-is
    if (error instanceof OpenAIError) {
      throw error;
    }

    // Wrap other errors
    throw new OpenAIError(
      'OpenAI Vision extraction failed',
      'server_error',
      error instanceof Error ? error.message : String(error)
    );
  }
}
