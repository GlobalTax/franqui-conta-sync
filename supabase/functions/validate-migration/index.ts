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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { centroCode, fiscalYear, startDate, endDate } = await req.json();

    console.log('Validating migration:', { centroCode, fiscalYear, startDate, endDate });

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check for unbalanced entries
    const { data: unbalancedEntries, error: balanceError } = await supabaseClient
      .from('accounting_entries')
      .select('id, entry_number, total_debit, total_credit')
      .eq('centro_code', centroCode)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .or(`total_debit.neq.total_credit`);

    if (balanceError) throw balanceError;

    if (unbalancedEntries && unbalancedEntries.length > 0) {
      unbalancedEntries.forEach(entry => {
        const diff = Math.abs(entry.total_debit - entry.total_credit);
        if (diff > 0.01) {
          errors.push(
            `Asiento ${entry.entry_number} descuadrado: Debe=${entry.total_debit.toFixed(2)} Haber=${entry.total_credit.toFixed(2)}`
          );
        }
      });
    }

    // 2. Check for accounts not in chart of accounts
    const { data: invalidAccounts, error: accountsError } = await supabaseClient.rpc(
      'check_invalid_accounts',
      { p_centro_code: centroCode, p_start_date: startDate, p_end_date: endDate }
    );

    if (accountsError) {
      console.warn('Could not check invalid accounts:', accountsError);
      warnings.push('No se pudieron validar todas las cuentas contables');
    } else if (invalidAccounts && invalidAccounts.length > 0) {
      invalidAccounts.forEach((acc: any) => {
        warnings.push(`Cuenta ${acc.account_code} no existe en el plan contable`);
      });
    }

    // 3. Check dates are within fiscal year
    const { data: outOfRangeEntries, error: dateError } = await supabaseClient
      .from('accounting_entries')
      .select('id, entry_number, entry_date')
      .eq('centro_code', centroCode)
      .or(`entry_date.lt.${startDate},entry_date.gt.${endDate}`);

    if (dateError) throw dateError;

    if (outOfRangeEntries && outOfRangeEntries.length > 0) {
      outOfRangeEntries.forEach(entry => {
        errors.push(
          `Asiento ${entry.entry_number} tiene fecha fuera del ejercicio: ${entry.entry_date}`
        );
      });
    }

    // 4. Calculate trial balance
    const { data: trialBalance, error: tbError } = await supabaseClient.rpc(
      'calculate_trial_balance_full',
      {
        p_centro_code: centroCode,
        p_company_id: null,
        p_start_date: startDate,
        p_end_date: endDate,
        p_nivel: 1,
        p_show_zero_balance: false,
      }
    );

    if (tbError) {
      console.warn('Could not calculate trial balance:', tbError);
      warnings.push('No se pudo calcular el balance de sumas y saldos');
    } else if (trialBalance) {
      const totalDebit = trialBalance.reduce((sum: number, acc: any) => sum + (acc.debit_total || 0), 0);
      const totalCredit = trialBalance.reduce((sum: number, acc: any) => sum + (acc.credit_total || 0), 0);
      const diff = Math.abs(totalDebit - totalCredit);

      if (diff > 0.01) {
        errors.push(
          `Balance de sumas y saldos descuadrado: Debe=${totalDebit.toFixed(2)} Haber=${totalCredit.toFixed(2)}`
        );
      }
    }

    const valid = errors.length === 0;

    console.log('Validation complete:', { valid, errors: errors.length, warnings: warnings.length });

    return new Response(
      JSON.stringify({
        valid,
        errors,
        warnings,
        summary: {
          totalErrors: errors.length,
          totalWarnings: warnings.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        errors: [error?.message || 'Error desconocido'],
        warnings: [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
