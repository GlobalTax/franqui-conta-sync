import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReprocessRequest {
  invoiceId: string;
  engine: 'openai';
}

interface OCRResult {
  confidence: number;
  data: any;
  raw: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, engine }: ReprocessRequest = await req.json();

    console.log(`[OCR Reprocess] Starting for invoice ${invoiceId} with engine ${engine}`);

    // 1. Crear cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Obtener factura actual
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices_received')
      .select('*, document_path')
      .eq('id', invoiceId)
      .single();

    if (fetchError) {
      console.error('[OCR Reprocess] Error fetching invoice:', fetchError);
      throw new Error('Factura no encontrada');
    }

    if (!invoice?.document_path) {
      throw new Error('La factura no tiene documento adjunto');
    }

    console.log(`[OCR Reprocess] Document path: ${invoice.document_path}`);

    // 3. Descargar documento desde storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(invoice.document_path);

    if (downloadError) {
      console.error('[OCR Reprocess] Error downloading file:', downloadError);
      throw new Error('No se pudo descargar el documento');
    }

    // 4. Convertir a Base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log(`[OCR Reprocess] File size: ${arrayBuffer.byteLength} bytes`);

    // 5. Procesar con motor seleccionado
    let ocrResult: OCRResult;
    const startTime = Date.now();

    // Siempre usar OpenAI
    ocrResult = await processWithOpenAI(base64Content);

    const processingTime = Date.now() - startTime;

    console.log(`[OCR Reprocess] Processing completed in ${processingTime}ms with confidence ${ocrResult.confidence}`);

    // 6. Actualizar factura con nuevos datos
    const updateData: any = {
      ocr_confidence: ocrResult.confidence,
      ocr_extracted_data: ocrResult.data,
      ocr_engine: 'openai',
      updated_at: new Date().toISOString()
    };

    // Actualizar campos si existen en el resultado OCR
    if (ocrResult.data.invoice_number) {
      updateData.invoice_number = ocrResult.data.invoice_number;
    }
    if (ocrResult.data.totals?.subtotal != null) {
      updateData.subtotal = ocrResult.data.totals.subtotal;
    }
    if (ocrResult.data.totals?.vat_total != null) {
      updateData.tax_total = ocrResult.data.totals.vat_total;
    }
    if (ocrResult.data.totals?.total != null) {
      updateData.total = ocrResult.data.totals.total;
    }

    await supabase
      .from('invoices_received')
      .update(updateData)
      .eq('id', invoiceId);

    // 7. Log de reprocesamiento
    await supabase.from('ocr_processing_log').insert({
      invoice_id: invoiceId,
      engine: 'openai',
      confidence: ocrResult.confidence,
      raw_response: ocrResult.raw,
      extracted_data: ocrResult.data,
      processing_time_ms: processingTime,
      is_reprocess: true,
      created_at: new Date().toISOString()
    });

    console.log('[OCR Reprocess] Success');

    return new Response(
      JSON.stringify({ 
        success: true, 
        confidence: ocrResult.confidence, 
        engine,
        data: ocrResult.data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[OCR Reprocess] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Error desconocido al reprocesar OCR'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});

/**
 * Procesa documento con OpenAI Vision
 */
async function processWithOpenAI(base64Content: string): Promise<OCRResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extrae los siguientes datos de esta factura española en formato JSON:
{
  "invoice_number": "número de factura",
  "invoice_date": "fecha formato YYYY-MM-DD",
  "supplier": {
    "name": "razón social",
    "tax_id": "NIF/CIF"
  },
  "totals": {
    "subtotal": número (base imponible),
    "vat_total": número (total IVA),
    "total": número (total factura)
  }
}

Responde SOLO con el JSON, sin explicaciones adicionales.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Content}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenAI] Error response:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content || '{}';
  
  // Intentar parsear el JSON (puede venir con markdown ```json)
  let parsedData;
  try {
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsedData = JSON.parse(cleanContent);
  } catch (e) {
    console.error('[OpenAI] Failed to parse JSON:', content);
    throw new Error('No se pudo parsear la respuesta de OpenAI');
  }

  // Calcular confianza básica (si todos los campos críticos existen)
  const hasInvoiceNumber = !!parsedData.invoice_number;
  const hasSupplier = !!parsedData.supplier?.tax_id;
  const hasTotals = parsedData.totals?.total != null;
  
  let confidence = 0;
  if (hasInvoiceNumber) confidence += 0.3;
  if (hasSupplier) confidence += 0.4;
  if (hasTotals) confidence += 0.3;

  return {
    confidence,
    data: parsedData,
    raw: result
  };
}

