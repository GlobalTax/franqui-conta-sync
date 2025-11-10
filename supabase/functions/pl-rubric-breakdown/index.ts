import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      template_code,
      rubric_code,
      company_id,
      centro_code,
      start_date,
      end_date,
      compare_yoy = false,
    } = await req.json();

    console.log(`[pl-rubric-breakdown] ${rubric_code} | ${start_date} → ${end_date} | YoY: ${compare_yoy}`);

    // 1. Obtener info de la rúbrica
    const { data: templateData } = await supabaseClient
      .from('pl_templates')
      .select('id')
      .eq('code', template_code)
      .single();

    if (!templateData) {
      throw new Error(`Template ${template_code} no encontrado`);
    }

    const { data: rubricData } = await supabaseClient
      .from('pl_rubrics')
      .select('code, name, level, sign')
      .eq('template_id', templateData.id)
      .eq('code', rubric_code)
      .single();

    if (!rubricData) {
      throw new Error(`Rúbrica ${rubric_code} no encontrada`);
    }

    // 2. Llamar al RPC
    const { data: accounts, error } = await supabaseClient.rpc(
      'get_pl_rubric_breakdown' as any,
      {
        p_template_code: template_code,
        p_rubric_code: rubric_code,
        p_company_id: company_id || null,
        p_centro_code: centro_code || null,
        p_start_date: start_date,
        p_end_date: end_date,
        p_compare_yoy: compare_yoy,
      }
    );

    if (error) throw error;

    // 3. Calcular totales
    const totalCurrent = (accounts || []).reduce((sum: number, a: any) => sum + parseFloat(a.amount_current), 0);
    const totalYoY = compare_yoy 
      ? (accounts || []).reduce((sum: number, a: any) => sum + parseFloat(a.amount_yoy || 0), 0) 
      : undefined;
    const varianceAmount = compare_yoy && totalYoY !== undefined
      ? totalCurrent - totalYoY
      : undefined;
    const variancePercent = compare_yoy && totalYoY && totalYoY !== 0
      ? ((varianceAmount! / Math.abs(totalYoY)) * 100)
      : undefined;

    // 4. Calcular fechas YoY
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const yoyStartDate = new Date(startDateObj.getFullYear() - 1, startDateObj.getMonth(), startDateObj.getDate());
    const yoyEndDate = new Date(endDateObj.getFullYear() - 1, endDateObj.getMonth(), endDateObj.getDate());

    // 5. Respuesta
    return new Response(
      JSON.stringify({
        success: true,
        rubric: rubricData,
        period: {
          start_date,
          end_date,
          total_amount: totalCurrent,
        },
        ...(compare_yoy && {
          period_yoy: {
            start_date: yoyStartDate.toISOString().split('T')[0],
            end_date: yoyEndDate.toISOString().split('T')[0],
            total_amount: totalYoY,
          },
        }),
        accounts: (accounts || []).map((a: any) => ({
          account_code: a.account_code,
          account_name: a.account_name || a.account_code,
          amount_current: parseFloat(a.amount_current),
          ...(compare_yoy && {
            amount_yoy: parseFloat(a.amount_yoy || 0),
            variance_amount: parseFloat(a.variance_amount || 0),
            variance_percent: a.variance_percent !== null ? parseFloat(a.variance_percent) : null,
          }),
          match_rule: a.match_rule || a.match_kind,
          match_kind: a.match_kind,
        })),
        totals: {
          current: totalCurrent,
          ...(compare_yoy && {
            yoy: totalYoY,
            variance_amount: varianceAmount,
            variance_percent: variancePercent,
          }),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[pl-rubric-breakdown] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
