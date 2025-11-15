import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostDepreciationParams {
  assetId: string;
  year: number;
  month: number;
  centroCode: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const params: PostDepreciationParams = await req.json();
    const { assetId, year, month, centroCode, userId } = params;

    console.log('Posting depreciation entry:', { assetId, year, month, centroCode });

    // Obtener amortización del periodo
    const { data: depreciation, error: depError } = await supabase
      .from('asset_depreciations')
      .select(`
        *,
        fixed_assets (
          asset_code,
          description,
          account_code
        )
      `)
      .eq('asset_id', assetId)
      .eq('period_year', year)
      .eq('period_month', month)
      .is('accounting_entry_id', null)
      .single();

    if (depError) throw new Error(`Error fetching depreciation: ${depError.message}`);
    if (!depreciation) throw new Error('No depreciation found for this period');

    const asset = depreciation.fixed_assets as any;

    // Obtener siguiente número de asiento
    const { count } = await supabase
      .from('accounting_entries')
      .select('*', { count: 'exact', head: true })
      .eq('centro_code', centroCode);

    const nextNumber = (count || 0) + 1;

    // Crear asiento contable
    const entryDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data: entry, error: entryError } = await supabase
      .from('accounting_entries')
      .insert({
        centro_code: centroCode,
        entry_number: nextNumber,
        entry_date: entryDate,
        description: `Amortización ${asset.asset_code} - ${asset.description}`,
        status: 'posted',
        total_debit: depreciation.depreciation_amount,
        total_credit: depreciation.depreciation_amount,
        created_by: userId,
        posted_at: new Date().toISOString(),
        posted_by: userId,
      })
      .select()
      .single();

    if (entryError) throw new Error(`Error creating entry: ${entryError.message}`);

    // Crear transacciones
    const transactions = [
      {
        entry_id: entry.id,
        account_code: '6810000', // Amortización del inmovilizado material
        movement_type: 'debit',
        amount: depreciation.depreciation_amount,
        description: `Amortización ${asset.asset_code}`,
        line_number: 1,
      },
      {
        entry_id: entry.id,
        account_code: '2810000', // Amortización acumulada
        movement_type: 'credit',
        amount: depreciation.depreciation_amount,
        description: `Amortización acumulada ${asset.asset_code}`,
        line_number: 2,
      },
    ];

    const { error: transError } = await supabase
      .from('accounting_transactions')
      .insert(transactions);

    if (transError) throw new Error(`Error creating transactions: ${transError.message}`);

    // Actualizar amortización con entry_id
    const { error: updateError } = await supabase
      .from('asset_depreciations')
      .update({ accounting_entry_id: entry.id })
      .eq('id', depreciation.id);

    if (updateError) throw new Error(`Error updating depreciation: ${updateError.message}`);

    console.log('Depreciation entry posted successfully:', entry.id);

    return new Response(
      JSON.stringify({
        success: true,
        entry_id: entry.id,
        entry_number: entry.entry_number,
        depreciation_amount: depreciation.depreciation_amount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error posting depreciation entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
