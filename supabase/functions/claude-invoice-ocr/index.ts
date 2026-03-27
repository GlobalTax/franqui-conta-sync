// ============================================================================
// CLAUDE INVOICE OCR - Edge function para extracción de facturas con Claude Vision
// Reemplaza Mindee Invoice API con ~89% reducción de coste
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizeBackend } from "../_shared/fiscal/normalize-backend.ts";
import type { EnhancedInvoiceData } from "../_shared/ocr/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXTRACTION_PROMPT = `Eres un experto en contabilidad española (PGC) especializado en extracción de datos de facturas.

Analiza esta factura y extrae los datos en formato JSON estricto. Sigue estas reglas:

1. **Tipo de documento**: Determina si es "invoice" (factura), "credit_note" (abono/rectificativa) o "ticket".
2. **NIF/CIF**: Extrae y normaliza los NIF/CIF del emisor y receptor. Formato español: letra + 8 dígitos o 8 dígitos + letra.
3. **Fecha**: Formato YYYY-MM-DD. Si la fecha es ambigua (DD/MM/YYYY vs MM/DD/YYYY), asume formato europeo DD/MM/YYYY.
4. **Desglose IVA**: Separa las bases imponibles por tipo de IVA:
   - base_10 / vat_10: IVA reducido (10%)
   - base_21 / vat_21: IVA general (21%)
   - other_taxes: cualquier otro impuesto (RE, IRPF, etc.)
5. **Líneas de detalle**: Extrae cada línea con descripción, cantidad, precio unitario e importe.
6. **Total**: El total con impuestos incluidos.
7. **Confianza**: Indica tu nivel de confianza general (0-100) y notas sobre campos dudosos.

Responde SOLO con un JSON válido con esta estructura exacta (sin markdown, sin comentarios):

{
  "document_type": "invoice" | "credit_note" | "ticket",
  "issuer": {
    "name": "string",
    "vat_id": "string o null"
  },
  "receiver": {
    "name": "string o null",
    "vat_id": "string o null",
    "address": "string o null"
  },
  "invoice_number": "string",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD o null",
  "totals": {
    "currency": "EUR",
    "base_10": number o null,
    "vat_10": number o null,
    "base_21": number o null,
    "vat_21": number o null,
    "other_taxes": [{"type": "string", "base": number, "quota": number}],
    "total": number
  },
  "lines": [{"description": "string", "quantity": number o null, "unit_price": number o null, "amount": number}],
  "centre_hint": "string o null",
  "payment_method": "transfer" | "card" | "cash" | null,
  "confidence_notes": ["string"],
  "confidence_score": number,
  "discrepancies": ["string"],
  "proposed_fix": null,
  "validation_errors": []
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { invoice_id, documentPath, centroCode } = await req.json();

    if (!invoice_id || !documentPath || !centroCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan parámetros: invoice_id, documentPath, centroCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY no configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Download PDF from Storage
    console.log(`[claude-ocr] Descargando PDF: ${documentPath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(documentPath);

    if (downloadError || !fileData) {
      throw new Error(`Error descargando PDF: ${downloadError?.message || 'archivo no encontrado'}`);
    }

    // 2. Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const fileSizeKB = Math.round(arrayBuffer.byteLength / 1024);
    console.log(`[claude-ocr] PDF convertido a base64: ${fileSizeKB}KB`);

    // 3. Determine media type
    const isPDF = documentPath.toLowerCase().endsWith('.pdf');
    const mediaType = isPDF ? 'application/pdf' : 'image/jpeg';

    // 4. Call Claude Vision API
    console.log(`[claude-ocr] Invocando Claude Vision para invoice ${invoice_id}...`);
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error(`[claude-ocr] Error API Anthropic: ${claudeResponse.status}`, errorText);
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeResult = await claudeResponse.json();
    const processingTimeMs = Date.now() - startTime;

    // 5. Parse Claude response
    const textContent = claudeResult.content?.find((c: any) => c.type === 'text')?.text;
    if (!textContent) {
      throw new Error('Claude no devolvió contenido de texto');
    }

    // Clean potential markdown wrapping
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    let extractedData: EnhancedInvoiceData;
    try {
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[claude-ocr] Error parseando JSON de Claude:', jsonText.substring(0, 500));
      throw new Error('Claude devolvió JSON inválido');
    }

    // 6. Calculate cost
    const inputTokens = claudeResult.usage?.input_tokens || 0;
    const outputTokens = claudeResult.usage?.output_tokens || 0;
    // Claude Sonnet pricing: $3/MTok input, $15/MTok output
    const costUSD = (inputTokens * 3 / 1_000_000) + (outputTokens * 15 / 1_000_000);
    const costEUR = costUSD * 0.92; // approximate EUR conversion

    console.log(`[claude-ocr] Tokens: ${inputTokens} in / ${outputTokens} out | Coste: €${costEUR.toFixed(4)}`);

    // 7. Get company VAT IDs for receiver inference
    const { data: centreCompanies } = await supabase
      .from('centre_companies')
      .select('cif')
      .eq('centre_id', centroCode);
    
    const { data: centreData } = await supabase
      .from('centres')
      .select('company_tax_id')
      .eq('codigo', centroCode)
      .single();

    const companyVATIds: string[] = [];
    if (centreData?.company_tax_id) companyVATIds.push(centreData.company_tax_id);
    if (centreCompanies) {
      for (const cc of centreCompanies) {
        if (cc.cif && !companyVATIds.includes(cc.cif)) companyVATIds.push(cc.cif);
      }
    }

    // 8. Normalize with fiscal pipeline
    const rawText = jsonText; // Use extracted text for receiver inference
    const normalizeResult = normalizeBackend(extractedData, rawText, companyVATIds);
    const { normalized, validation, autofix_applied } = normalizeResult;

    // 9. Determine status
    const needsReview = !validation.ok || normalized.confidence_score < 70;
    const invoiceStatus = needsReview ? 'needs_review' : 'processed_ok';
    const approvalStatus = needsReview ? 'needs_review' : 'auto_approved';

    // 10. Update invoice record
    const { error: updateError } = await supabase
      .from('invoices_received')
      .update({
        invoice_number: normalized.invoice_number || undefined,
        invoice_date: normalized.issue_date || undefined,
        supplier_name: normalized.issuer.name || undefined,
        supplier_tax_id: normalized.issuer.vat_id || undefined,
        customer_name: normalized.receiver.name || undefined,
        customer_tax_id: normalized.receiver.vat_id || undefined,
        total: normalized.totals.total,
        base_imponible_10: normalized.totals.base_10,
        cuota_iva_10: normalized.totals.vat_10,
        base_imponible_21: normalized.totals.base_21,
        cuota_iva_21: normalized.totals.vat_21,
        document_type: normalized.document_type,
        status: invoiceStatus,
        approval_status: approvalStatus,
        ocr_engine: 'claude',
        ocr_confidence: normalized.confidence_score,
        ocr_raw_response: claudeResult,
        ocr_processed_at: new Date().toISOString(),
        ocr_cost_eur: costEUR,
        validation_errors: validation.errors.length > 0 ? validation.errors : null,
        autofix_applied: autofix_applied.length > 0 ? autofix_applied : null,
        confidence_notes: normalized.confidence_notes,
      })
      .eq('id', invoice_id);

    if (updateError) {
      console.error('[claude-ocr] Error actualizando factura:', updateError);
      throw new Error(`Error actualizando factura: ${updateError.message}`);
    }

    // 11. Insert invoice lines
    if (normalized.lines && normalized.lines.length > 0) {
      const linesToInsert = normalized.lines.map((line: any, idx: number) => ({
        invoice_id: invoice_id,
        line_number: idx + 1,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        amount: line.amount,
      }));

      const { error: linesError } = await supabase
        .from('invoice_lines')
        .insert(linesToInsert);

      if (linesError) {
        console.warn('[claude-ocr] Error insertando líneas:', linesError.message);
      }
    }

    // 12. Log OCR processing
    await supabase.from('ocr_processing_log').insert({
      invoice_id,
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_eur: costEUR,
      processing_time_ms: processingTimeMs,
      confidence_score: normalized.confidence_score,
      status: invoiceStatus,
      autofix_applied,
      validation_errors: validation.errors,
    }).then(({ error }) => {
      if (error) console.warn('[claude-ocr] Error logging OCR:', error.message);
    });

    console.log(`[claude-ocr] ✓ Factura ${invoice_id} procesada: ${invoiceStatus} | Confianza: ${normalized.confidence_score}% | Coste: €${costEUR.toFixed(4)} | ${processingTimeMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id,
        ocr_engine: 'claude',
        ocr_confidence: normalized.confidence_score,
        ocr_cost_euros: costEUR,
        ocr_processing_time_ms: processingTimeMs,
        ocr_tokens: { input: inputTokens, output: outputTokens },
        needs_manual_review: needsReview,
        approval_status: approvalStatus,
        supplier_name: normalized.issuer.name,
        validation: {
          ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        autofix_applied,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[claude-ocr] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error desconocido',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
