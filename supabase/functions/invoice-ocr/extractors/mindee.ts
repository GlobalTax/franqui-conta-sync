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
  base64Content: string
): Promise<MindeeExtractionResult> {
  
  const MINDEE_API_KEY = Deno.env.get('MINDEE_API_KEY');
  if (!MINDEE_API_KEY) {
    throw new Error('MINDEE_API_KEY not configured');
  }

  console.log('[Mindee] Starting extraction...');

  // Convertir base64 a Blob
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('document', blob, 'invoice.pdf');

  const response = await fetch(
    'https://api.mindee.net/v1/products/mindee/invoices/v4/predict',
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${MINDEE_API_KEY}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Mindee] API error:', response.status, errorText);
    throw new Error(`Mindee API error: ${response.status}`);
  }

  const mindeeResult = await response.json();
  const prediction = mindeeResult.document.inference.prediction;

  console.log('[Mindee] Extraction completed');

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

  // Calcular confidences por campo
  const confidenceByField: Record<string, number> = {
    'issuer.name': (prediction.supplier_name?.confidence || 0) * 100,
    'issuer.vat_id': (prediction.supplier_company_registrations?.[0]?.confidence || 0) * 100,
    'invoice_number': (prediction.invoice_number?.confidence || 0) * 100,
    'totals.total': (prediction.total_amount?.confidence || 0) * 100,
    'issue_date': (prediction.date?.confidence || 0) * 100
  };

  const criticalFields = ['issuer.vat_id', 'invoice_number', 'totals.total', 'issue_date'];
  const criticalConfidence = criticalFields
    .map(f => confidenceByField[f] || 0)
    .reduce((sum, c) => sum + c, 0) / criticalFields.length;

  const allFieldsConfidence = Object.values(confidenceByField)
    .reduce((sum, c) => sum + c, 0) / Object.keys(confidenceByField).length;

  const avgConfidence = (criticalConfidence * 0.7) + (allFieldsConfidence * 0.3);

  console.log(`[Mindee] Confidence: ${Math.round(avgConfidence)}%`);

  return {
    data,
    confidence_score: Math.round(avgConfidence),
    confidence_by_field: confidenceByField,
    raw_response: mindeeResult
  };
}
