// ============================================================================
// GET SUPPLIER TEMPLATE
// Edge function para obtener template OCR activo de un proveedor
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  supplier_id?: string;
  supplier_vat_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { supplier_id, supplier_vat_id }: RequestBody = await req.json();

    console.log('[get-supplier-template] Request:', { supplier_id, supplier_vat_id });

    let query = supabase
      .from('supplier_ocr_templates')
      .select(`
        *,
        supplier:suppliers (
          id,
          tax_id,
          name,
          commercial_name
        )
      `)
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

    // Buscar por supplier_id o supplier_vat_id
    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    } else if (supplier_vat_id) {
      // Primero encontrar el supplier por VAT ID
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('tax_id', supplier_vat_id)
        .eq('active', true)
        .maybeSingle();

      if (supplierError) {
        console.error('[get-supplier-template] Error finding supplier:', supplierError);
        return new Response(
          JSON.stringify({ error: 'Error finding supplier', details: supplierError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!supplier) {
        console.log('[get-supplier-template] No supplier found for VAT ID:', supplier_vat_id);
        return new Response(
          JSON.stringify({ template: null, message: 'No supplier found for VAT ID' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      query = query.eq('supplier_id', supplier.id);
    } else {
      return new Response(
        JSON.stringify({ error: 'supplier_id or supplier_vat_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('[get-supplier-template] Error:', error);
      return new Response(
        JSON.stringify({ error: 'Error fetching template', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const template = templates && templates.length > 0 ? templates[0] : null;

    console.log('[get-supplier-template] Found template:', template?.id || 'none');

    return new Response(
      JSON.stringify({ 
        template,
        message: template ? 'Template found' : 'No active template found for supplier'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[get-supplier-template] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
