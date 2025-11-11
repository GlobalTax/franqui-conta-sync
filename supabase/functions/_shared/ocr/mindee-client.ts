// ============================================================================
// MINDEE CLIENT V4 - Pure extraction logic with Blob support
// ============================================================================

import type { MindeeExtractionResult } from "./types.ts";
import { adaptMindeeV4ToStandard } from "./mindee-adapter.ts";

export async function extractWithMindee(
  input: Blob | string
): Promise<MindeeExtractionResult> {
  
  const MINDEE_API_KEY = Deno.env.get('MINDEE_API_KEY');
  if (!MINDEE_API_KEY) {
    throw new Error('MINDEE_API_KEY not configured');
  }

  // Validate and sanitize API key
  const sanitizedKey = MINDEE_API_KEY.trim().replace(/\s/g, '');
  if (!sanitizedKey || sanitizedKey.length < 10) {
    throw new Error('MINDEE_API_KEY appears to be invalid or too short');
  }

  console.log('[Mindee V4] Starting extraction...');
  console.log('[Mindee V4] API Key configured:', !!sanitizedKey);
  console.log('[Mindee V4] Input type:', input instanceof Blob ? 'Blob' : 'base64 string');

  // ✅ MEJORA V4: Usar FormData con Blob para mejor performance
  const formData = new FormData();
  
  if (input instanceof Blob) {
    // Usar Blob directo (más eficiente)
    formData.append('document', input, 'invoice.pdf');
    console.log('[Mindee V4] Using Blob input (optimized)');
  } else {
    // Fallback a base64 (convertir a Blob)
    const base64Data = input.replace(/^data:.*?;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    formData.append('document', blob, 'invoice.pdf');
    console.log('[Mindee V4] Converted base64 to Blob');
  }

  // ✅ API V4 endpoint (sync prediction)
  const apiUrl = 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';
  
  console.log('[Mindee V4] Calling API:', apiUrl);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${sanitizedKey}`
      // NO incluir Content-Type, el browser lo agrega automáticamente con boundary
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Mindee V4] API error:', response.status, errorText);
    
    if (response.status === 401) {
      throw new Error('Mindee API authentication failed. Check MINDEE_API_KEY.');
    }
    
    throw new Error(`Mindee V4 API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('[Mindee V4] API response received');
  
  // Validar estructura de respuesta V4
  if (!result.document || !result.document.inference) {
    console.error('[Mindee V4] Invalid response structure:', JSON.stringify(result, null, 2));
    throw new Error('Invalid Mindee V4 response structure');
  }

  console.log('[Mindee V4] Extraction completed successfully');

  // ✅ Adaptar V4 → formato estándar
  return adaptMindeeV4ToStandard(result);
}
