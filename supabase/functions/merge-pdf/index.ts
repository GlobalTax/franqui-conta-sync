// ============================================================================
// EDGE FUNCTION: merge-pdf
// Purpose: Combinar múltiples PDFs en un único documento
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "pdf-lib";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  invoice_ids: string[];
  primary_invoice_id: string;
  order: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();

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
    const body: MergeRequest = await req.json();
    const { invoice_ids, primary_invoice_id, order } = body;

    console.log(`[merge-pdf] Merging ${invoice_ids.length} invoices`);

    // 3. Validate
    if (!invoice_ids || invoice_ids.length < 2 || invoice_ids.length > 20) {
      throw new Error('Invalid number of invoices (2-20 allowed)');
    }

    if (!primary_invoice_id || !invoice_ids.includes(primary_invoice_id)) {
      throw new Error('Primary invoice must be in the list');
    }

    // 4. Get all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices_received')
      .select('*')
      .in('id', invoice_ids);

    if (invoicesError || !invoices || invoices.length !== invoice_ids.length) {
      throw new Error('Failed to fetch invoices');
    }

    // 5. Validate same centro
    const centroCode = invoices[0].centro_code;
    if (!invoices.every(inv => inv.centro_code === centroCode)) {
      throw new Error('All invoices must belong to the same centro');
    }

    // 6. Order invoices
    const orderedInvoices = order.map(id => invoices.find(inv => inv.id === id)!);

    // 7. Create merged PDF
    const mergedPdf = await PDFDocument.create();
    let totalPages = 0;
    const downloadPromises = [];

    for (const invoice of orderedInvoices) {
      if (!invoice.document_path) {
        console.warn(`Invoice ${invoice.id} has no document, skipping`);
        continue;
      }

      // Download PDF
      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from('invoice-documents')
        .download(invoice.document_path);

      if (downloadError || !pdfBlob) {
        console.error(`Failed to download ${invoice.document_path}:`, downloadError);
        continue;
      }

      // Load and copy pages
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      totalPages += pageCount;

      const copiedPages = await mergedPdf.copyPages(pdfDoc, Array.from({ length: pageCount }, (_, i) => i));
      copiedPages.forEach(page => mergedPdf.addPage(page));

      console.log(`[merge-pdf] Added ${pageCount} pages from invoice ${invoice.id}`);
    }

    if (totalPages === 0) {
      throw new Error('No pages to merge');
    }

    // 8. Save merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    const primaryInvoice = invoices.find(inv => inv.id === primary_invoice_id)!;
    const pathParts = primaryInvoice.document_path?.split('/') || [];
    const tipo = pathParts[0] || 'received';
    const year = pathParts[2] || new Date().getFullYear().toString();
    const month = pathParts[3] || String(new Date().getMonth() + 1).padStart(2, '0');

    const mergedFileName = `MERGED_${crypto.randomUUID()}.pdf`;
    const mergedPath = `${tipo}/${centroCode}/${year}/${month}/${mergedFileName}`;

    // 9. Upload merged PDF
    const { error: uploadError } = await supabase.storage
      .from('invoice-documents')
      .upload(mergedPath, mergedPdfBytes, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      throw new Error(`Failed to upload merged PDF: ${uploadError.message}`);
    }

    console.log(`[merge-pdf] Uploaded merged PDF to ${mergedPath}`);

    // 10. Update primary invoice
    await supabase
      .from('invoices_received')
      .update({
        document_path: mergedPath,
        notes: `Documento fusionado con ${invoice_ids.length - 1} factura(s) el ${new Date().toISOString()}`,
      })
      .eq('id', primary_invoice_id);

    // 11. Delete secondary invoices and their PDFs
    const secondaryIds = invoice_ids.filter(id => id !== primary_invoice_id);
    const deletedInvoices = [];

    for (const invoiceId of secondaryIds) {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice?.document_path) {
        // Delete from storage
        await supabase.storage
          .from('invoice-documents')
          .remove([invoice.document_path])
          .catch(err => console.warn(`Failed to delete ${invoice.document_path}:`, err));
      }

      // Delete from DB
      await supabase
        .from('invoices_received')
        .delete()
        .eq('id', invoiceId);

      deletedInvoices.push(invoiceId);
      console.log(`[merge-pdf] Deleted invoice ${invoiceId}`);
    }

    const processingTime = Date.now() - startTime;

    // 12. Log operation
    await supabase.from('pdf_operations_log').insert({
      operation_type: 'merge',
      user_id: user.id,
      invoice_ids: invoice_ids,
      centro_code: centroCode,
      processing_time_ms: processingTime,
      pages_processed: totalPages,
      success: true,
    }).catch(err => console.warn('Failed to log operation:', err));

    return new Response(
      JSON.stringify({
        success: true,
        merged_invoice_id: primary_invoice_id,
        document_path: mergedPath,
        total_pages: totalPages,
        deleted_invoice_ids: deletedInvoices,
        processing_time_ms: processingTime,
        message: `${invoice_ids.length} PDFs fusionados correctamente`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[merge-pdf] Error:', error);
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
