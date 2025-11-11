// ============================================================================
// OPENAI VISION CLIENT - Pure extraction logic
// ============================================================================

import type { EnhancedInvoiceData, OpenAIExtractionResult } from "./types.ts";

export async function extractWithOpenAI(
  base64Content: string,
  mimeType: string
): Promise<OpenAIExtractionResult> {
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const systemPrompt = `Eres un experto en extracción de datos de facturas españolas.
Debes extraer TODOS los campos del siguiente JSON schema y retornar confidences por campo (0-100).

Reglas críticas:
- document_type: "invoice" si es factura normal, "credit_note" si es abono/nota de crédito, "ticket" si es ticket
- issuer.vat_id: NIF/CIF español (validar formato A12345678, B12345678, etc.)
- totals: Desglosar IVA 10% y 21% en campos separados (base_10, vat_10, base_21, vat_21)
- totals.other_taxes: Incluir IRPF y otros impuestos con type, base, quota
- Validar: bases + IVAs = total (tolerancia ±0.01)
- lines: Extraer todas las líneas de la factura con description, quantity, unit_price, amount
- Si no encuentras un campo, usa null (no inventes datos)

Schema de salida:
{
  "data": {
    "document_type": "invoice",
    "issuer": {
      "name": "Proveedor SL",
      "vat_id": "B12345678"
    },
    "receiver": {
      "name": "Mi Empresa SL",
      "vat_id": "B87654321",
      "address": "Calle Principal 123"
    },
    "invoice_number": "2024-001",
    "issue_date": "2024-01-15",
    "due_date": "2024-02-15",
    "totals": {
      "currency": "EUR",
      "base_10": 100.00,
      "vat_10": 10.00,
      "base_21": 200.00,
      "vat_21": 42.00,
      "other_taxes": [],
      "total": 352.00
    },
    "lines": [
      {
        "description": "Producto A",
        "quantity": 10,
        "unit_price": 10.00,
        "amount": 100.00
      }
    ],
    "centre_hint": null,
    "payment_method": null,
    "confidence_notes": [],
    "confidence_score": 0,
    "discrepancies": [],
    "proposed_fix": null
  },
  "confidence_by_field": {
    "issuer.vat_id": 95,
    "invoice_number": 90,
    "totals.total": 85,
    "issue_date": 90
  }
}`;

  console.log('[OpenAI Vision] Starting extraction...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenAI Vision] API error:', response.status, errorText);
    throw new Error(`OpenAI Vision API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const extracted = JSON.parse(result.choices[0].message.content);

  console.log('[OpenAI Vision] Extraction completed');

  // Calcular confidence global (promedio ponderado)
  const confidenceByField = extracted.confidence_by_field || {};
  const criticalFields = ['issuer.vat_id', 'invoice_number', 'totals.total', 'issue_date'];
  
  const criticalConfidence = criticalFields
    .map(f => confidenceByField[f] || 0)
    .reduce((sum, c) => sum + c, 0) / criticalFields.length;

  const allFieldsConfidence = Object.values(confidenceByField)
    .reduce((sum: number, c: any) => sum + (c as number), 0) / Math.max(Object.keys(confidenceByField).length, 1);

  const globalConfidence = (criticalConfidence * 0.7) + (allFieldsConfidence * 0.3);

  console.log(`[OpenAI Vision] Confidence: ${Math.round(globalConfidence)}%`);

  return {
    data: extracted.data,
    confidence_score: Math.round(globalConfidence),
    confidence_by_field: confidenceByField,
    raw_response: result
  };
}
