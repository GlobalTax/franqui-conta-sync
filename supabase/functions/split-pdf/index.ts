// ============================================================================
// EDGE FUNCTION: split-pdf
// Purpose: Divide un PDF multipágina en varios documentos individuales
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "pdf-lib";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SplitRange {
  from_page: number;
  to_page: number;
  name: string;
}

interface SplitRequest {
  invoice_id: string;
  document_path: string;
  splits: SplitRange[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Parse request
    const body: SplitRequest = await req.json();
    const { invoice_id, document_path, splits } = body;

    console.log(`[split-pdf] Processing invoice ${invoice_id} with ${splits.length} splits`);

    // 3. Validate splits
    if (!splits || splits.length === 0 || splits.length > 10) {
      throw new Error('Invalid number of splits (1-10 allowed)');
    }

    // 4. Get original invoice data
    const { data: originalInvoice, error: invoiceError } = await supabase
      .from('invoices_received')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !originalInvoice) {
      throw new Error('Invoice not found');
    }

    // 5. Download original PDF
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('invoice-documents')
      .download(document_path);

    if (downloadError || !pdfBlob) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`);
    }

    console.log('[split-pdf] PDF downloaded, processing...');

    // 6. Load PDF document
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    // 7. Validate page ranges
    for (const split of splits) {
      if (split.from_page < 1 || split.to_page > totalPages || split.from_page > split.to_page) {
        throw new Error(`Invalid page range: ${split.from_page}-${split.to_page} (total pages: ${totalPages})`);
      }
    }

    // 8. Create new PDFs
    const newInvoices = [];
    const pathParts = document_path.split('/');
    const tipo = pathParts[0];
    const centroCode = pathParts[1];
    const year = pathParts[2];
    const month = pathParts[3];

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const startTime = Date.now();

      // Create new PDF
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: split.to_page - split.from_page + 1 },
        (_, idx) => split.from_page - 1 + idx
      );
      
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));

      // Save PDF
      const pdfBytes = await newPdf.save();
      const newFileName = `${crypto.randomUUID()}_${split.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const newPath = `${tipo}/${centroCode}/${year}/${month}/${newFileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('invoice-documents')
        .upload(newPath, pdfBytes, { contentType: 'application/pdf', upsert: false });

      if (uploadError) {
        console.error(`Failed to upload split ${i + 1}:`, uploadError);
        throw new Error(`Failed to upload split: ${uploadError.message}`);
      }

      // Create invoice record
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices_received')
        .insert({
          supplier_id: originalInvoice.supplier_id,
          centro_code: originalInvoice.centro_code,
          invoice_number: `${originalInvoice.invoice_number}_p${split.from_page}-${split.to_page}`,
          invoice_date: originalInvoice.invoice_date,
          due_date: originalInvoice.due_date,
          total: 0, // User will need to update
          subtotal: 0,
          tax_total: 0,
          status: 'pending_approval',
          document_path: newPath,
          ocr_confidence: null,
          notes: `Documento separado del original ${originalInvoice.invoice_number}`,
          approval_status: 'pending_manager',
          requires_manager_approval: true,
          requires_accounting_approval: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError || !newInvoice) {
        console.error(`Failed to create invoice record:`, insertError);
        throw new Error(`Failed to create invoice: ${insertError?.message}`);
      }

      const processingTime = Date.now() - startTime;

      newInvoices.push({
        id: newInvoice.id,
        document_path: newPath,
        pages: split.to_page - split.from_page + 1,
        processing_time_ms: processingTime,
      });

      console.log(`[split-pdf] Created invoice ${newInvoice.id} (${split.from_page}-${split.to_page}, ${processingTime}ms)`);
    }

    // 9. Update original invoice status
    await supabase
      .from('invoices_received')
      .update({
        status: 'split',
        notes: `Documento dividido en ${splits.length} facturas el ${new Date().toISOString()}`,
      })
      .eq('id', invoice_id);

    // 10. Log operation
    await supabase.from('pdf_operations_log').insert({
      operation_type: 'split',
      user_id: user.id,
      invoice_ids: [invoice_id, ...newInvoices.map(inv => inv.id)],
      centro_code: originalInvoice.centro_code,
      processing_time_ms: newInvoices.reduce((sum, inv) => sum + inv.processing_time_ms, 0),
      pages_processed: totalPages,
      success: true,
    }).catch(err => console.warn('Failed to log operation:', err));

    return new Response(
      JSON.stringify({
        success: true,
        original_invoice_id: invoice_id,
        new_invoices: newInvoices,
        message: `PDF dividido en ${splits.length} nuevas facturas`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[split-pdf] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
