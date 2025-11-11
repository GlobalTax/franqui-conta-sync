// ============================================================================
// MINDEE EXTRACTOR
// ============================================================================

interface EnhancedInvoiceData {
  document_type: "invoice" | "credit_note" | "ticket";
  issuer: {
    name: string;
    vat_id: string | null;
  };
  receiver: {
    name: string | null;
    vat_id: string | null;
    address: string | null;
  };
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  totals: {
    currency: string;
    base_10: number | null;
    vat_10: number | null;
    base_21: number | null;
    vat_21: number | null;
    other_taxes: Array<{
      type: string;
      base: number;
      quota: number;
    }>;
    total: number;
  };
  lines: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    amount: number;
  }>;
  centre_hint: string | null;
  payment_method: "transfer" | "card" | "cash" | null;
  confidence_notes: string[];
  confidence_score: number;
  discrepancies: string[];
  proposed_fix: {
    what: string;
    why: string;
  } | null;
}

export interface MindeeExtractionResult {
  data: EnhancedInvoiceData;
  confidence_score: number;
  confidence_by_field: Record<string, number>;
  raw_response: any;
}

export async function extractWithMindee(
  input: Blob | string
): Promise<MindeeExtractionResult> {
  
  // ⭐ V2: Sanitizar y validar MINDEE_API_KEY
  const rawKey = Deno.env.get('MINDEE_API_KEY');
  if (!rawKey) {
    throw new Error('MINDEE_API_KEY not configured');
  }

  // Normalizar: eliminar comillas, espacios y prefijos Bearer/Token
  const apiKey = rawKey.trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^\s*(Token|Bearer)\s+/i, '');

  console.log('[Mindee V2] 🔑 API key fingerprint:', `${apiKey.slice(0,4)}…${apiKey.slice(-4)} (len:${apiKey.length})`);
  console.log('[Mindee V2] Starting extraction with asynchronous API...');

  // ✅ Manejar ambos formatos (Blob directo o base64)
  let blob: Blob;
  
  if (input instanceof Blob) {
    console.log('[Mindee V2] Using direct Blob input');
    blob = input;
  } else {
    console.log('[Mindee V2] Converting base64 to Blob');
    const { decode: b64decode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    
    try {
      const bytes = b64decode(input);
      blob = new Blob([bytes.slice()], { type: 'application/pdf' });
      console.log(`[Mindee V2] ✅ Base64 decoded - ${blob.size} bytes`);
    } catch (decodeError: any) {
      console.error('[Mindee V2] ❌ Base64 decode failed:', decodeError);
      throw new Error(`Base64 decode failed: ${decodeError.message}`);
    }
  }

  // ============================================================================
  // STEP 1: ENQUEUE (V2 API - siempre asíncrono)
  // ============================================================================
  
  const formData = new FormData();
  formData.append('file', blob, 'invoice.pdf');
  formData.append('model_id', 'mindee/invoices'); // Modelo de facturas de Mindee
  formData.append('polygon', 'true');
  formData.append('confidence', 'true');

  console.log('[Mindee V2] → POST /v2/inferences/enqueue');
  
  const enqueueResponse = await fetch('https://api-v2.mindee.net/v2/inferences/enqueue', {
    method: 'POST',
    headers: {
      'Authorization': apiKey // V2: sin prefijo "Token"
    },
    body: formData
  });

  // ✅ Manejo robusto de errores
  if (!enqueueResponse.ok) {
    const errorText = await enqueueResponse.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { detail: errorText };
    }
    
    console.error('[Mindee V2] API error:', enqueueResponse.status, errorData);
    
    if (enqueueResponse.status === 401) {
      throw new Error('Mindee API key inválida (V2). Verifica MINDEE_API_KEY.');
    } else if (enqueueResponse.status === 429) {
      throw new Error('Límite de tasa de Mindee alcanzado. Intenta de nuevo en unos minutos.');
    } else if (enqueueResponse.status === 413) {
      throw new Error('PDF demasiado grande para Mindee (máximo por archivo).');
    } else if (enqueueResponse.status === 422) {
      const errors = errorData.error?.errors || [];
      const details = errors.map((e: any) => `${e.pointer}: ${e.detail}`).join('; ');
      throw new Error(`Error de validación Mindee V2: ${details || errorData.error?.detail || 'Unknown'}`);
    } else if (enqueueResponse.status >= 500) {
      throw new Error('Servicio Mindee temporalmente no disponible. Intenta más tarde.');
    } else {
      const msg = errorData.error?.detail || errorData.detail || `HTTP ${enqueueResponse.status}`;
      throw new Error(`Error Mindee API V2: ${msg}`);
    }
  }
  
  const enqueueData = await enqueueResponse.json();
  const jobId = enqueueData.job?.id;
  const pollingUrl = enqueueData.job?.polling_url;
  
  if (!jobId) {
    console.error('[Mindee V2] Invalid enqueue response:', enqueueData);
    throw new Error('Mindee V2: job ID not received');
  }
  
  console.log(`[Mindee V2] ✅ Job enqueued: ${jobId}`);
  console.log(`[Mindee V2] Polling URL: ${pollingUrl}`);

  // ============================================================================
  // STEP 2: POLLING (/v2/jobs/{job_id})
  // ============================================================================
  
  console.log('[Mindee V2] → Starting polling for job completion...');
  
  const maxAttempts = 60; // 60 intentos x 2s = 120s max (v2 permite más tiempo)
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s entre intentos
    attempt++;
    
    console.log(`[Mindee V2] → GET /v2/jobs/${jobId} (attempt ${attempt}/${maxAttempts})`);
    
    const jobStatusResponse = await fetch(
      `https://api-v2.mindee.net/v2/jobs/${jobId}`,
      {
        headers: { 'Authorization': apiKey }
      }
    );
    
    if (!jobStatusResponse.ok) {
      console.warn(`[Mindee V2] ⚠️ Polling attempt ${attempt} failed (${jobStatusResponse.status})`);
      
      if (jobStatusResponse.status === 429) {
        console.log('[Mindee V2] Rate limited, waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5s extra
      }
      
      continue;
    }
    
    const jobData = await jobStatusResponse.json();
    const status = jobData.job?.status;
    
    console.log(`[Mindee V2] Job status: ${status}`);
    
    if (status === 'Processed') {
      const resultUrl = jobData.job?.result_url;
      const inferenceId = resultUrl?.split('/').pop();
      
      if (!inferenceId) {
        console.error('[Mindee V2] No inference ID in processed job:', jobData);
        throw new Error('Mindee V2: inference ID not found');
      }
      
      console.log(`[Mindee V2] ✅ Job processed! Inference ID: ${inferenceId}`);
      
      // ============================================================================
      // STEP 3: GET RESULT (/v2/inferences/{inference_id})
      // ============================================================================
      
      console.log(`[Mindee V2] → GET /v2/inferences/${inferenceId}`);
      
      const resultResponse = await fetch(
        `https://api-v2.mindee.net/v2/inferences/${inferenceId}`,
        {
          headers: { 'Authorization': apiKey }
        }
      );
      
      if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        console.error('[Mindee V2] Failed to fetch result:', resultResponse.status, errorText);
        throw new Error(`Mindee V2: failed to fetch result (${resultResponse.status})`);
      }
      
      const inferenceData = await resultResponse.json();
      console.log('[Mindee V2] ✅ Inference result retrieved');
      
      return processMindeeV2Response(inferenceData);
      
    } else if (status === 'Failed') {
      const error = jobData.job?.error;
      console.error('[Mindee V2] Job failed:', error);
      throw new Error(`Mindee V2 processing failed: ${error?.detail || 'Unknown error'}`);
    }
    
    // Status: Processing, continuar polling
  }
  
  throw new Error('Mindee V2 timeout: job did not complete in 120 seconds');
}

// ============================================================================
// PROCESAMIENTO DE RESPUESTA MINDEE V2
// ============================================================================
function processMindeeV2Response(inferenceData: any): MindeeExtractionResult {
  const inference = inferenceData.inference;
  const result = inference.result;
  const fields = result.fields;
  
  console.log('[Mindee V2] Processing inference result...');
  console.log('[Mindee V2] File:', inference.file?.name, `(${inference.file?.page_count} pages)`);
  
  // Helper: extraer valor de campo V2
  const getFieldValue = (field: any) => field?.value ?? null;
  const getFieldConfidence = (field: any): number => {
    if (!field?.confidence) return 0;
    // V2 usa: "Certain", "High", "Medium", "Low", "Uncertain"
    const confidenceMap: Record<string, number> = {
      'Certain': 95,
      'High': 85,
      'Medium': 70,
      'Low': 50,
      'Uncertain': 30
    };
    return confidenceMap[field.confidence] || 0;
  };

  // Mapear respuesta de Mindee V2 a nuestro formato EnhancedInvoiceData
  const data: EnhancedInvoiceData = {
    document_type: getFieldValue(fields.document_type) === 'credit_note' ? 'credit_note' : 'invoice',
    issuer: {
      name: getFieldValue(fields.supplier_name) || '',
      vat_id: getFieldValue(fields.supplier_tax_id) || null
    },
    receiver: {
      name: getFieldValue(fields.customer_name) || null,
      vat_id: getFieldValue(fields.customer_tax_id) || null,
      address: getFieldValue(fields.customer_address) || null
    },
    invoice_number: getFieldValue(fields.invoice_number) || '',
    issue_date: getFieldValue(fields.invoice_date) || '',
    due_date: getFieldValue(fields.due_date) || null,
    totals: {
      currency: getFieldValue(fields.currency) || 'EUR',
      base_10: null,
      vat_10: null,
      base_21: null,
      vat_21: null,
      other_taxes: [],
      total: getFieldValue(fields.total_amount) || 0
    },
    lines: [],
    centre_hint: null,
    payment_method: null,
    confidence_notes: [],
    confidence_score: 0,
    discrepancies: [],
    proposed_fix: null
  };

  // Extraer líneas de factura (V2)
  const lineItems = fields.line_items;
  if (Array.isArray(lineItems)) {
    data.lines = lineItems.map((item: any, index: number) => ({
      description: getFieldValue(item.description) || `Línea ${index + 1}`,
      quantity: getFieldValue(item.quantity) || null,
      unit_price: getFieldValue(item.unit_price) || null,
      amount: getFieldValue(item.total_amount) || 0
    }));
  }

  // Extraer VAT breakdown si está disponible (V2)
  const taxes = fields.taxes;
  if (Array.isArray(taxes)) {
    taxes.forEach((tax: any) => {
      const rate = getFieldValue(tax.rate);
      const base = getFieldValue(tax.base_amount) || 0;
      const amount = getFieldValue(tax.tax_amount) || 0;
      
      if (rate && Math.abs(rate - 10) < 0.5) {
        data.totals.base_10 = base;
        data.totals.vat_10 = amount;
      } else if (rate && Math.abs(rate - 21) < 0.5) {
        data.totals.base_21 = base;
        data.totals.vat_21 = amount;
      } else {
        const taxType = getFieldValue(tax.type) || 'OTHER';
        if (taxType.includes('IRPF') || taxType.includes('retention')) {
          data.totals.other_taxes.push({
            type: 'IRPF',
            base,
            quota: amount
          });
        }
      }
    });
  }

  // ============================================================================
  // GENERADOR DE CONFIDENCE NOTES
  // ============================================================================
  
  function generateConfidenceNotes(confidenceByField: Record<string, number>): string[] {
    const CONFIDENCE_THRESHOLD = 80;
    const notes: string[] = [];
    
    const fieldLabels: Record<string, string> = {
      'issuer.name': 'Nombre proveedor',
      'issuer.vat_id': 'NIF/CIF proveedor',
      'invoice_number': 'Número de factura',
      'totals.total': 'Total factura',
      'issue_date': 'Fecha de emisión',
      'due_date': 'Fecha de vencimiento',
      'receiver.vat_id': 'NIF cliente',
      'line_items': 'Líneas de factura'
    };
    
    for (const [field, confidence] of Object.entries(confidenceByField)) {
      if (confidence < CONFIDENCE_THRESHOLD && confidence > 0) {
        const label = fieldLabels[field] || field;
        const level = confidence < 50 ? 'CRÍTICO' : confidence < 70 ? 'bajo' : 'medio';
        const emoji = confidence < 50 ? '🔴' : confidence < 70 ? '⚠️' : '⚡';
        
        notes.push(`${emoji} ${label}: confidence ${level} (${Math.round(confidence)}%) - revisar`);
      }
    }
    
    // Notas especiales para campos críticos ausentes
    if (!confidenceByField['issuer.vat_id'] || confidenceByField['issuer.vat_id'] === 0) {
      notes.push('🔴 NIF proveedor NO detectado - entrada manual requerida');
    }
    
    if (!confidenceByField['invoice_number'] || confidenceByField['invoice_number'] === 0) {
      notes.push('🔴 Número de factura NO detectado - entrada manual requerida');
    }
    
    if (!confidenceByField['issue_date'] || confidenceByField['issue_date'] === 0) {
      notes.push('🔴 Fecha de emisión NO detectada - entrada manual requerida');
    }
    
    return notes;
  }

  // ============================================================================
  // CÁLCULO DE CONFIDENCE POR CAMPO (V2)
  // ============================================================================
  
  const confidenceByField: Record<string, number> = {
    'issuer.name': getFieldConfidence(fields.supplier_name),
    'issuer.vat_id': getFieldConfidence(fields.supplier_tax_id),
    'invoice_number': getFieldConfidence(fields.invoice_number),
    'totals.total': getFieldConfidence(fields.total_amount),
    'issue_date': getFieldConfidence(fields.invoice_date),
    'due_date': getFieldConfidence(fields.due_date),
    'receiver.vat_id': getFieldConfidence(fields.customer_tax_id),
    'line_items': Array.isArray(fields.line_items) && fields.line_items.length > 0
      ? fields.line_items.reduce((sum: number, item: any) => 
          sum + getFieldConfidence(item), 0) / fields.line_items.length
      : 0
  };

  const criticalFields = ['issuer.vat_id', 'invoice_number', 'totals.total', 'issue_date'];
  const criticalConfidence = criticalFields
    .map(f => confidenceByField[f] || 0)
    .reduce((sum, c) => sum + c, 0) / criticalFields.length;

  const allFieldsConfidence = Object.values(confidenceByField)
    .reduce((sum, c) => sum + c, 0) / Object.keys(confidenceByField).length;

  const avgConfidence = (criticalConfidence * 0.7) + (allFieldsConfidence * 0.3);

  // ============================================================================
  // GENERAR CONFIDENCE NOTES Y ACTUALIZAR DATA
  // ============================================================================
  
  data.confidence_notes = generateConfidenceNotes(confidenceByField);
  data.confidence_score = Math.round(avgConfidence);

  // Log de advertencias si hay notas
  if (data.confidence_notes.length > 0) {
    console.log(`[Mindee] ⚠️ Confidence warnings (${data.confidence_notes.length}):`, data.confidence_notes);
  }

  console.log(`[Mindee V2] Confidence: ${Math.round(avgConfidence)}%`);

  return {
    data,
    confidence_score: Math.round(avgConfidence),
    confidence_by_field: confidenceByField,
    raw_response: inferenceData
  };
}
