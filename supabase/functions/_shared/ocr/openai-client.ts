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
  supplierHint?: string | null,
  modelOverride?: string,
  imageDataUrl?: string // Optional: client-provided PNG for PDFs
): Promise<OpenAIExtractionResult> {
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new OpenAIError('OPENAI_API_KEY not configured', 'auth');
  }

  // Get model from override, env or use default
  const modelName = modelOverride || Deno.env.get('OCR_OPENAI_MODEL') || DEFAULT_MODEL;
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
  console.log(`[OpenAI Vision] Document type: ${mimeType}`);

  // Setup timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Prepare content array based on mime type or client-provided image
  let contentArray: any[];
  
  // Priority 1: Use client-provided imageDataUrl if available (PDFs converted on client)
  if (imageDataUrl) {
    console.log('[OpenAI] Using client-provided imageDataUrl (PDF converted on client)');
    console.log(`[OpenAI] Image size: ${Math.round(imageDataUrl.length / 1024)}KB`);
    
    contentArray = [
      { 
        type: 'text', 
        text: 'Extrae todos los datos de esta factura española conforme al esquema. IMPORTANTE: Ejecuta la auto-validación contable (EQ1, EQ2, EQ3) antes de responder.' 
      },
      { 
        type: 'image_url', 
        image_url: { 
          url: imageDataUrl,
          detail: 'high'
        } 
      }
    ];
  } 
  // Priority 2: Handle PDFs (will fail with clear error if OffscreenCanvas unavailable)
  else if (mimeType === 'application/pdf') {
    console.log('[OpenAI] Document is PDF - attempting server-side conversion...');
    
    // Attempt server-side conversion (will fail on Supabase Edge due to OffscreenCanvas)
    try {
      const { convertPdfToImage } = await import('./pdf-to-image.ts');
      console.log('[OpenAI] PDF converter module loaded ✓');
      
      const conversionStartTime = Date.now();
      const imageDataUri = await convertPdfToImage(base64Content);
      const conversionTime = Date.now() - conversionStartTime;
      
      console.log(`[OpenAI] ✓ PDF converted to PNG successfully in ${conversionTime}ms`);
      console.log(`[OpenAI] Image data URI length: ${imageDataUri.length} chars`);
      
      contentArray = [
        { 
          type: 'text', 
          text: 'Extrae todos los datos de esta factura española conforme al esquema. IMPORTANTE: Ejecuta la auto-validación contable (EQ1, EQ2, EQ3) antes de responder.' 
        },
        { 
          type: 'image_url', 
          image_url: { 
            url: imageDataUri,
            detail: 'high'
          } 
        }
      ];
    } catch (conversionError) {
      console.error(`[OpenAI] ✗ Server-side PDF conversion failed:`, conversionError);
      
      // Clear error message for client to handle
      throw new OpenAIError(
        'PDF conversion not available in Edge runtime. Client must provide imageDataUrl.', 
        'server_error',
        conversionError instanceof Error ? conversionError.message : String(conversionError)
      );
    }
  } 
  // Priority 3: Standard image formats (PNG, JPG, WebP, GIF)
  else {
    console.log(`[OpenAI] Using data URI for ${mimeType}`);
    
    contentArray = [
      { 
        type: 'text', 
        text: 'Extrae todos los datos de esta factura española conforme al esquema. IMPORTANTE: Ejecuta la auto-validación contable (EQ1, EQ2, EQ3) antes de responder.' 
      },
      { 
        type: 'image_url', 
        image_url: { 
          url: `data:${mimeType};base64,${base64Content}`,
          detail: 'high'
        } 
      }
    ];
  }

  try {
    // ✅ Always use chat/completions endpoint (supports both PDFs and images)
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    console.log(`[OpenAI] Using endpoint: ${endpoint}`);

    // ✅ Unified request body for all document types
    const requestBody = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: contentArray
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
      temperature: 0
    };

    // Make API request with fallback
    let response: Response;
    let actualFormat = 'json_schema';
    
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      // If json_schema fails with 400, retry with json_object
      if (!response.ok && response.status === 400) {
        const errorText = await response.text();
        console.warn('[OpenAI] json_schema failed with 400, retrying with json_object...', errorText);
        
        const retryBody = {
          ...requestBody,
          response_format: { type: 'json_object' }
        };
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(retryBody),
          signal: controller.signal
        });
        
        actualFormat = 'json_object';
      }
      
      console.log(`[OpenAI] Response format used: ${actualFormat}`);
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new OpenAIError('OpenAI request timeout', 'timeout');
      }
      throw new OpenAIError(`Network error: ${fetchError.message}`, 'server_error', String(fetchError));
    }

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
    const normalized = adaptOpenAIToStandard(result);
    
    // ✅ FALLBACK: Retry with gpt-4o if confidence is low or critical fields missing
    const hasCriticalFields = normalized.data?.issuer?.vat_id && 
                               normalized.data?.issue_date && 
                               (normalized.data?.lines?.length > 0 || normalized.data?.totals?.total > 0);
    
    if (!modelOverride && modelName !== 'gpt-4o' && (normalized.confidence_score < 60 || !hasCriticalFields)) {
      console.warn(`[Fallback] Low confidence (${normalized.confidence_score}%) or missing critical fields. Retrying with gpt-4o...`);
      console.log('[Fallback] Missing fields check:', {
        vat_id: !!normalized.data?.issuer?.vat_id,
        issue_date: !!normalized.data?.issue_date,
        has_lines: normalized.data?.lines?.length > 0,
        has_totals: normalized.data?.totals?.total > 0
      });
      
      // Recursive call with gpt-4o override
      return await extractWithOpenAI(base64Content, mimeType, documentType, supplierHint, 'gpt-4o');
    }
    
    return normalized;

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
