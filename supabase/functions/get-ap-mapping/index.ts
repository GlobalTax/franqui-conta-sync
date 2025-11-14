import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { apMapperEngine, matchSupplier } from "../_shared/ap/mapping-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supplierVatId, centroCode, lines } = await req.json();
    
    console.log('[get-ap-mapping] Request:', { supplierVatId, centroCode, linesCount: lines?.length });
    
    if (!supplierVatId || !centroCode) {
      throw new Error('supplierVatId and centroCode are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Match supplier by VAT ID
    const supplierData = await matchSupplier(
      supabase,
      { vat_id: supplierVatId },
      centroCode
    );

    console.log('[get-ap-mapping] Supplier found:', supplierData?.name || 'None');

    // Build minimal EnhancedInvoiceData for mapper
    const invoiceData = {
      document_type: 'invoice' as const,
      issuer: {
        vat_id: supplierVatId,
        name: supplierData?.name || ''
      },
      receiver: {
        name: null,
        vat_id: null,
        address: null
      },
      invoice_number: 'DRAFT',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: null,
      totals: {
        currency: 'EUR',
        base_10: null,
        vat_10: null,
        base_21: null,
        vat_21: null,
        other_taxes: [],
        total: 0
      },
      lines: (lines || []).map((line: any) => ({
        description: line.description || '',
        quantity: line.quantity || null,
        unit_price: line.unit_price || null,
        amount: (line.quantity || 0) * (line.unit_price || 0)
      })),
      centre_hint: centroCode,
      payment_method: null,
      confidence_notes: [],
      confidence_score: 100,
      discrepancies: [],
      proposed_fix: null
    };

    // Get AP mapping suggestions
    const apMapping = await apMapperEngine(
      invoiceData,
      supabase,
      supplierData
    );
    
    console.log('[get-ap-mapping] Mapping result:', {
      invoice_account: apMapping.invoice_level.account_suggestion,
      confidence: apMapping.invoice_level.confidence_score,
      line_count: apMapping.line_level?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      ap_mapping: apMapping
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error('[get-ap-mapping] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
