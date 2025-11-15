import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationError {
  row_number?: number;
  error_type: 'unbalanced' | 'invalid_account' | 'date_out_of_range' | 'missing_data' | 'trial_balance';
  severity: 'error' | 'warning';
  entity_type: 'journal_entry' | 'iva_invoice' | 'bank_transaction';
  entity_id?: string;
  entity_number?: number;
  field?: string;
  value?: string;
  expected?: string;
  message: string;
  suggestion?: string;
}

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

    const detailedErrors: ValidationError[] = [];

    // 1. Check for unbalanced entries
    const { data: unbalancedEntries, error: balanceError } = await supabaseClient
      .from('accounting_entries')
      .select('id, entry_number, entry_date, description, total_debit, total_credit')
      .eq('centro_code', centroCode)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .or(`total_debit.neq.total_credit`);

    if (balanceError) throw balanceError;

    if (unbalancedEntries && unbalancedEntries.length > 0) {
      unbalancedEntries.forEach((entry, index) => {
        const diff = Math.abs(entry.total_debit - entry.total_credit);
        if (diff > 0.01) {
          detailedErrors.push({
            row_number: index + 1,
            error_type: 'unbalanced',
            severity: 'error',
            entity_type: 'journal_entry',
            entity_id: entry.id,
            entity_number: entry.entry_number,
            field: 'balance',
            value: `D:${entry.total_debit.toFixed(2)} H:${entry.total_credit.toFixed(2)}`,
            expected: 'Debe = Haber',
            message: `Asiento ${entry.entry_number} (${entry.entry_date}): ${entry.description}`,
            suggestion: `Diferencia de ${diff.toFixed(2)}€. Revisar apuntes del asiento.`,
          });
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
      detailedErrors.push({
        error_type: 'missing_data',
        severity: 'warning',
        entity_type: 'journal_entry',
        message: 'No se pudieron validar todas las cuentas contables',
        suggestion: 'Verificar conexión con la base de datos',
      });
    } else if (invalidAccounts && invalidAccounts.length > 0) {
      invalidAccounts.forEach((acc: any, index: number) => {
        detailedErrors.push({
          row_number: index + 1,
          error_type: 'invalid_account',
          severity: 'warning',
          entity_type: 'journal_entry',
          field: 'account_code',
          value: acc.account_code,
          expected: 'Cuenta existente en plan contable',
          message: `Cuenta ${acc.account_code} no existe en el plan contable`,
          suggestion: 'Crear cuenta en el plan contable o corregir el código',
        });
      });
    }

    // 3. Check dates are within fiscal year
    const { data: outOfRangeEntries, error: dateError } = await supabaseClient
      .from('accounting_entries')
      .select('id, entry_number, entry_date, description')
      .eq('centro_code', centroCode)
      .or(`entry_date.lt.${startDate},entry_date.gt.${endDate}`);

    if (dateError) throw dateError;

    if (outOfRangeEntries && outOfRangeEntries.length > 0) {
      outOfRangeEntries.forEach((entry, index) => {
        detailedErrors.push({
          row_number: index + 1,
          error_type: 'date_out_of_range',
          severity: 'error',
          entity_type: 'journal_entry',
          entity_id: entry.id,
          entity_number: entry.entry_number,
          field: 'entry_date',
          value: entry.entry_date,
          expected: `Entre ${startDate} y ${endDate}`,
          message: `Asiento ${entry.entry_number}: ${entry.description}`,
          suggestion: `Fecha ${entry.entry_date} está fuera del ejercicio fiscal`,
        });
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
      detailedErrors.push({
        error_type: 'trial_balance',
        severity: 'warning',
        entity_type: 'journal_entry',
        message: 'No se pudo calcular el balance de sumas y saldos',
        suggestion: 'Verificar que existan asientos en el período',
      });
    } else if (trialBalance) {
      const totalDebit = trialBalance.reduce((sum: number, acc: any) => sum + (acc.debit_total || 0), 0);
      const totalCredit = trialBalance.reduce((sum: number, acc: any) => sum + (acc.credit_total || 0), 0);
      const diff = Math.abs(totalDebit - totalCredit);

      if (diff > 0.01) {
        detailedErrors.push({
          error_type: 'trial_balance',
          severity: 'error',
          entity_type: 'journal_entry',
          field: 'total_balance',
          value: `D:${totalDebit.toFixed(2)} H:${totalCredit.toFixed(2)}`,
          expected: 'Debe = Haber',
          message: 'Balance de sumas y saldos descuadrado',
          suggestion: `Diferencia total de ${diff.toFixed(2)}€. Revisar todos los asientos.`,
        });
      }
    }

    const errors = detailedErrors.filter(e => e.severity === 'error');
    const warnings = detailedErrors.filter(e => e.severity === 'warning');

    const summary = {
      totalEntries: 0,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      errorsByType: {
        unbalanced: detailedErrors.filter(e => e.error_type === 'unbalanced').length,
        invalid_accounts: detailedErrors.filter(e => e.error_type === 'invalid_account').length,
        dates: detailedErrors.filter(e => e.error_type === 'date_out_of_range').length,
        trial_balance: detailedErrors.filter(e => e.error_type === 'trial_balance').length,
        missing_data: detailedErrors.filter(e => e.error_type === 'missing_data').length,
      },
    };

    console.log('Validation complete:', summary);

    return new Response(
      JSON.stringify({
        valid: errors.length === 0,
        errors,
        warnings,
        summary,
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
