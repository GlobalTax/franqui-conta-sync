// ============================================================================
// SAVE SUPPLIER TEMPLATE
// Edge function para crear/actualizar templates OCR de proveedores
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  template_id?: string; // Si existe, actualiza; si no, crea
  supplier_id: string;
  template_name: string;
  document_type?: 'invoice' | 'ticket' | 'credit_note';
  field_mappings: Record<string, any>;
  extraction_strategy?: 'coordinates' | 'regex' | 'ocr_fallback';
  preferred_ocr_engine?: 'template' | 'openai' | 'mindee';
  confidence_threshold?: number;
  is_active?: boolean;
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

    // Get user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();

    console.log('[save-supplier-template] Request:', {
      template_id: body.template_id,
      supplier_id: body.supplier_id,
      template_name: body.template_name,
      field_count: Object.keys(body.field_mappings || {}).length
    });

    // Validaciones
    if (!body.supplier_id || !body.template_name || !body.field_mappings) {
      return new Response(
        JSON.stringify({ error: 'supplier_id, template_name, and field_mappings are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el supplier existe
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('id', body.supplier_id)
      .single();

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ error: 'Supplier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templateData = {
      supplier_id: body.supplier_id,
      template_name: body.template_name,
      document_type: body.document_type || 'invoice',
      field_mappings: body.field_mappings,
      extraction_strategy: body.extraction_strategy || 'coordinates',
      preferred_ocr_engine: body.preferred_ocr_engine || 'template',
      confidence_threshold: body.confidence_threshold ?? 0.8,
      is_active: body.is_active ?? true,
      created_by: user.id,
    };

    let result;

    if (body.template_id) {
      // UPDATE existing template
      const { data, error } = await supabase
        .from('supplier_ocr_templates')
        .update(templateData)
        .eq('id', body.template_id)
        .select()
        .single();

      if (error) {
        console.error('[save-supplier-template] Update error:', error);
        return new Response(
          JSON.stringify({ error: 'Error updating template', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = data;
      console.log('[save-supplier-template] Template updated:', result.id);

    } else {
      // CREATE new template
      const { data, error } = await supabase
        .from('supplier_ocr_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        console.error('[save-supplier-template] Insert error:', error);
        return new Response(
          JSON.stringify({ error: 'Error creating template', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = data;
      console.log('[save-supplier-template] Template created:', result.id);
    }

    return new Response(
      JSON.stringify({ 
        template: result,
        message: body.template_id ? 'Template updated successfully' : 'Template created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[save-supplier-template] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
