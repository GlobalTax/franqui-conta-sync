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
  input: Blob | string // ✅ FASE 1: Aceptar Blob o base64
): Promise<MindeeExtractionResult> {
  
  const MINDEE_API_KEY = Deno.env.get('MINDEE_API_KEY');
  if (!MINDEE_API_KEY) {
    throw new Error('MINDEE_API_KEY not configured');
  }

  console.log('[Mindee] Starting extraction...');

  // ✅ FASE 1: Manejar ambos formatos (Blob directo o base64)
  let blob: Blob;
  let pageCount = 1; // Default
  
  if (input instanceof Blob) {
    console.log('[Mindee] Using direct Blob input (no conversion needed)');
    blob = input;
    
    // Estimar páginas basándose en tamaño del archivo (aproximado)
    // 1 página PDF ~ 50-200KB, usamos 100KB como promedio
    pageCount = Math.max(1, Math.round(blob.size / 102400));
  } else {
    console.log('[Mindee] Converting base64 to Blob (safe method with Deno stdlib)');
    // ✅ FASE 1: Usar decode de Deno stdlib (NO atob manual) para evitar stack overflow
    const { decode: b64decode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    
    try {
      const bytes = b64decode(input);
      // Crear Blob desde Uint8Array (slice crea una copia compatible)
      blob = new Blob([bytes.slice()], { type: 'application/pdf' });
      pageCount = Math.max(1, Math.round(blob.size / 102400));
      console.log(`[Mindee] ✅ Base64 decoded successfully - ${blob.size} bytes, ~${pageCount} pages`);
    } catch (decodeError: any) {
      console.error('[Mindee] ❌ Base64 decode failed:', decodeError);
      throw new Error(`Base64 decode failed: ${decodeError.message}`);
    }
  }

  const formData = new FormData();
  formData.append('document', blob, 'invoice.pdf');

  // ✅ FASE 2: Usar modo asíncrono para PDFs grandes (>10 páginas)
  const useAsync = pageCount > 10;
  const endpoint = useAsync
    ? 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict_async'
    : 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';
  
  if (useAsync) {
    console.log(`[Mindee] Using ASYNC mode for large PDF (~${pageCount} pages)`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${MINDEE_API_KEY}`
    },
    body: formData
  });

  // ✅ FASE 2: Manejo robusto de errores según docs de Mindee
  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    
    console.error('[Mindee] API error:', response.status, errorData);
    
    // Errores específicos según documentación Mindee
    if (response.status === 401) {
      throw new Error('Mindee API key inválida o expirada. Verifica MINDEE_API_KEY.');
    } else if (response.status === 429) {
      throw new Error('Límite de tasa de Mindee alcanzado. Intenta de nuevo en unos minutos.');
    } else if (response.status === 413) {
      throw new Error('PDF demasiado grande para Mindee (máximo 25MB por archivo).');
    } else if (response.status === 400) {
      const msg = errorData.api_request?.error || errorData.message || 'Formato de documento inválido';
      throw new Error(`Error de validación Mindee: ${msg}`);
    } else if (response.status === 500 || response.status === 502 || response.status === 503) {
      throw new Error('Servicio Mindee temporalmente no disponible. Intenta más tarde.');
    } else {
      const msg = errorData.api_request?.error || errorData.message || `HTTP ${response.status}`;
      throw new Error(`Error Mindee API: ${msg}`);
    }
  }
  
  // ✅ FASE 2: Manejar respuesta asíncrona si es necesario
  if (useAsync) {
    const jobResponse = await response.json();
    const jobId = jobResponse.job?.id;
    
    if (!jobId) {
      throw new Error('Mindee async job ID not received');
    }
    
    console.log(`[Mindee] Async job created: ${jobId}, polling for results...`);
    
    // Polling con timeout de 60 segundos
    const maxAttempts = 30; // 30 intentos x 2s = 60s max
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s entre intentos
      
      const statusResponse = await fetch(
        `https://api.mindee.net/v1/products/mindee/invoices/v4/documents/${jobId}`,
        {
          headers: { 'Authorization': `Token ${MINDEE_API_KEY}` }
        }
      );
      
      if (!statusResponse.ok) {
        console.warn(`[Mindee] Polling attempt ${attempt + 1} failed`);
        attempt++;
        continue;
      }
      
      const statusData = await statusResponse.json();
      const status = statusData.job?.status;
      
      console.log(`[Mindee] Async job status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);
      
      if (status === 'completed') {
        console.log('[Mindee] ✅ Async extraction completed');
        // Continuar con el procesamiento normal
        const mindeeResult = statusData;
        return processMindeeResponse(mindeeResult);
      } else if (status === 'failed') {
        throw new Error('Mindee async processing failed');
      }
      
      attempt++;
    }
    
    throw new Error('Mindee async processing timeout (60s exceeded)');
  }

  const mindeeResult = await response.json();
  console.log('[Mindee] ✅ Extraction completed (sync mode)');
  
  return processMindeeResponse(mindeeResult);
}

// ============================================================================
// PROCESAMIENTO DE RESPUESTA MINDEE (Extraído para reutilización)
// ============================================================================
function processMindeeResponse(mindeeResult: any): MindeeExtractionResult {
  const prediction = mindeeResult.document.inference.prediction;

  // Mapear respuesta de Mindee a nuestro formato EnhancedInvoiceData
  const data: EnhancedInvoiceData = {
    document_type: prediction.invoice_type?.value === 'CREDIT_NOTE' ? 'credit_note' : 'invoice',
    issuer: {
      name: prediction.supplier_name?.value || '',
      vat_id: prediction.supplier_company_registrations?.find((r: any) => 
        r.type === 'VAT_NUMBER' || r.type === 'TAX_ID'
      )?.value || null
    },
    receiver: {
      name: prediction.customer_name?.value || null,
      vat_id: prediction.customer_company_registrations?.find((r: any) => 
        r.type === 'VAT_NUMBER' || r.type === 'TAX_ID'
      )?.value || null,
      address: prediction.customer_address?.value || null
    },
    invoice_number: prediction.invoice_number?.value || '',
    issue_date: prediction.date?.value || '',
    due_date: prediction.due_date?.value || null,
    totals: {
      currency: prediction.total_amount?.currency || 'EUR',
      base_10: null,
      vat_10: null,
      base_21: null,
      vat_21: null,
      other_taxes: [],
      total: prediction.total_amount?.value || 0
    },
    lines: prediction.line_items?.map((item: any, index: number) => ({
      description: item.description || `Línea ${index + 1}`,
      quantity: item.quantity || null,
      unit_price: item.unit_price || null,
      amount: item.total_amount || 0
    })) || [],
    centre_hint: null,
    payment_method: null,
    confidence_notes: [],
    confidence_score: 0,
    discrepancies: [],
    proposed_fix: null
  };

  // Extraer VAT breakdown si está disponible
  const taxes = prediction.taxes || [];
  taxes.forEach((tax: any) => {
    const rate = parseFloat(tax.rate);
    if (Math.abs(rate - 10) < 0.5) {
      data.totals.base_10 = tax.base || 0;
      data.totals.vat_10 = tax.value || 0;
    } else if (Math.abs(rate - 21) < 0.5) {
      data.totals.base_21 = tax.base || 0;
      data.totals.vat_21 = tax.value || 0;
    } else if (tax.code && tax.code.includes('IRPF')) {
      data.totals.other_taxes.push({
        type: 'IRPF',
        base: tax.base || 0,
        quota: tax.value || 0
      });
    }
  });

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
  // CÁLCULO DE CONFIDENCE POR CAMPO (ENRIQUECIDO)
  // ============================================================================
  
  const confidenceByField: Record<string, number> = {
    'issuer.name': (prediction.supplier_name?.confidence || 0) * 100,
    'issuer.vat_id': (prediction.supplier_company_registrations?.[0]?.confidence || 0) * 100,
    'invoice_number': (prediction.invoice_number?.confidence || 0) * 100,
    'totals.total': (prediction.total_amount?.confidence || 0) * 100,
    'issue_date': (prediction.date?.confidence || 0) * 100,
    'due_date': (prediction.due_date?.confidence || 0) * 100,
    'receiver.vat_id': (prediction.customer_company_registrations?.[0]?.confidence || 0) * 100,
    'line_items': prediction.line_items?.length > 0 
      ? (prediction.line_items.reduce((sum: number, item: any) => 
          sum + (item.confidence || 0), 0) / prediction.line_items.length) * 100 
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

  console.log(`[Mindee] Confidence: ${Math.round(avgConfidence)}%`);

  return {
    data,
    confidence_score: Math.round(avgConfidence),
    confidence_by_field: confidenceByField,
    raw_response: mindeeResult
  };
}
