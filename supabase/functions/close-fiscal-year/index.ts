// ============================================================================
// CLOSE FISCAL YEAR - Edge Function
// Purpose: Generate regularization and closing entries for fiscal year
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CloseRequest {
  centroCode: string;
  fiscalYearId: string;
  closingDate: string;
}

Deno.serve(async (req) => {
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

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CloseRequest = await req.json();
    const { centroCode, fiscalYearId, closingDate } = body;

    console.log(
      `[close-fiscal-year] Starting closure: ${fiscalYearId} at ${closingDate}`
    );

    // ========================================================================
    // STEP 1: Calculate P&L (Profit & Loss)
    // ========================================================================

    // Get total expenses (group 6)
    const { data: expensesData, error: expensesError } = await supabase.rpc(
      'get_account_balances_by_group',
      {
        p_centro_code: centroCode,
        p_fiscal_year_id: fiscalYearId,
        p_account_group: '6',
      }
    );

    if (expensesError) {
      console.error('[close-fiscal-year] Error getting expenses:', expensesError);
      throw new Error(`Error al calcular gastos: ${expensesError.message}`);
    }

    // Get total income (group 7)
    const { data: incomeData, error: incomeError } = await supabase.rpc(
      'get_account_balances_by_group',
      {
        p_centro_code: centroCode,
        p_fiscal_year_id: fiscalYearId,
        p_account_group: '7',
      }
    );

    if (incomeError) {
      console.error('[close-fiscal-year] Error getting income:', incomeError);
      throw new Error(`Error al calcular ingresos: ${incomeError.message}`);
    }

    const totalExpenses = expensesData?.reduce(
      (sum: number, acc: any) => sum + (acc.balance || 0),
      0
    ) || 0;
    
    const totalIncome = incomeData?.reduce(
      (sum: number, acc: any) => sum + (acc.balance || 0),
      0
    ) || 0;

    const result = totalIncome - totalExpenses;

    console.log(
      `[close-fiscal-year] P&L: Income=${totalIncome}, Expenses=${totalExpenses}, Result=${result}`
    );

    // ========================================================================
    // STEP 2: Regularization Entry (groups 6 & 7 to 129)
    // ========================================================================

    // Get next entry number
    const { data: maxEntry } = await supabase
      .from('accounting_entries')
      .select('entry_number')
      .eq('centro_code', centroCode)
      .eq('fiscal_year_id', fiscalYearId)
      .order('entry_number', { ascending: false })
      .limit(1)
      .single();

    const nextEntryNumber = (maxEntry?.entry_number || 0) + 1;

    // Create regularization entry
    const { data: regularizationEntry, error: regEntryError } = await supabase
      .from('accounting_entries')
      .insert({
        centro_code: centroCode,
        fiscal_year_id: fiscalYearId,
        entry_number: nextEntryNumber,
        entry_date: closingDate,
        serie: 'REGULARIZACION',
        description: `Regularización ejercicio ${closingDate.split('-')[0]}`,
        status: 'posted',
        posted_by: user.id,
        posted_at: new Date().toISOString(),
        created_by: user.id,
        total_debit: 0,
        total_credit: 0,
      })
      .select()
      .single();

    if (regEntryError) {
      console.error('[close-fiscal-year] Error creating regularization entry:', regEntryError);
      throw new Error(`Error al crear asiento de regularización: ${regEntryError.message}`);
    }

    console.log(`[close-fiscal-year] Regularization entry created: ${regularizationEntry.id}`);

    // Build regularization transactions
    const regTransactions: any[] = [];
    let lineNumber = 1;

    // Close expense accounts (6xx)
    if (expensesData && expensesData.length > 0) {
      for (const acc of expensesData) {
        if (Math.abs(acc.balance) > 0.01) {
          regTransactions.push({
            entry_id: regularizationEntry.id,
            account_code: acc.account_code,
            movement_type: 'credit',
            amount: Math.abs(acc.balance),
            description: 'Regularización',
            line_number: lineNumber++,
          });
        }
      }

      // Debit to 129 (expenses)
      regTransactions.push({
        entry_id: regularizationEntry.id,
        account_code: '1290000',
        movement_type: 'debit',
        amount: totalExpenses,
        description: 'Resultado del ejercicio - Gastos',
        line_number: lineNumber++,
      });
    }

    // Close income accounts (7xx)
    if (incomeData && incomeData.length > 0) {
      // Debit to income accounts
      for (const acc of incomeData) {
        if (Math.abs(acc.balance) > 0.01) {
          regTransactions.push({
            entry_id: regularizationEntry.id,
            account_code: acc.account_code,
            movement_type: 'debit',
            amount: Math.abs(acc.balance),
            description: 'Regularización',
            line_number: lineNumber++,
          });
        }
      }

      // Credit to 129 (income)
      regTransactions.push({
        entry_id: regularizationEntry.id,
        account_code: '1290000',
        movement_type: 'credit',
        amount: totalIncome,
        description: 'Resultado del ejercicio - Ingresos',
        line_number: lineNumber++,
      });
    }

    // Insert regularization transactions
    const { error: regTransError } = await supabase
      .from('accounting_transactions')
      .insert(regTransactions);

    if (regTransError) {
      console.error('[close-fiscal-year] Error creating reg transactions:', regTransError);
      // Rollback: delete entry
      await supabase
        .from('accounting_entries')
        .delete()
        .eq('id', regularizationEntry.id);
      throw new Error(`Error al crear transacciones de regularización: ${regTransError.message}`);
    }

    // Update regularization entry totals
    const regTotalDebit = regTransactions
      .filter((t) => t.movement_type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    const regTotalCredit = regTransactions
      .filter((t) => t.movement_type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    await supabase
      .from('accounting_entries')
      .update({
        total_debit: regTotalDebit,
        total_credit: regTotalCredit,
      })
      .eq('id', regularizationEntry.id);

    console.log(
      `[close-fiscal-year] Regularization entry completed: ${regTransactions.length} lines`
    );

    // ========================================================================
    // STEP 3: Closing Entry (balance sheet to 0)
    // ========================================================================

    // Get all balance sheet accounts (groups 1,2,3,4,5)
    const { data: balanceData, error: balanceError } = await supabase.rpc(
      'get_all_account_balances',
      {
        p_centro_code: centroCode,
        p_fiscal_year_id: fiscalYearId,
      }
    );

    if (balanceError) {
      console.error('[close-fiscal-year] Error getting balances:', balanceError);
      throw new Error(`Error al obtener saldos: ${balanceError.message}`);
    }

    // Filter balance sheet accounts only
    const balanceAccounts = balanceData?.filter((acc: any) => {
      const group = acc.account_code.charAt(0);
      return ['1', '2', '3', '4', '5'].includes(group) && Math.abs(acc.balance) > 0.01;
    }) || [];

    console.log(`[close-fiscal-year] Balance sheet accounts: ${balanceAccounts.length}`);

    // Create closing entry
    const { data: closingEntry, error: closeEntryError } = await supabase
      .from('accounting_entries')
      .insert({
        centro_code: centroCode,
        fiscal_year_id: fiscalYearId,
        entry_number: nextEntryNumber + 1,
        entry_date: closingDate,
        serie: 'CIERRE',
        description: `Cierre ejercicio ${closingDate.split('-')[0]}`,
        status: 'posted',
        posted_by: user.id,
        posted_at: new Date().toISOString(),
        created_by: user.id,
        total_debit: 0,
        total_credit: 0,
      })
      .select()
      .single();

    if (closeEntryError) {
      console.error('[close-fiscal-year] Error creating closing entry:', closeEntryError);
      throw new Error(`Error al crear asiento de cierre: ${closeEntryError.message}`);
    }

    console.log(`[close-fiscal-year] Closing entry created: ${closingEntry.id}`);

    // Build closing transactions
    const closeTransactions: any[] = [];
    lineNumber = 1;
    let totalDebitClose = 0;
    let totalCreditClose = 0;

    for (const acc of balanceAccounts) {
      if (acc.balance > 0) {
        // Debit balance (asset) → credit to close
        closeTransactions.push({
          entry_id: closingEntry.id,
          account_code: acc.account_code,
          movement_type: 'credit',
          amount: Math.abs(acc.balance),
          description: 'Cierre',
          line_number: lineNumber++,
        });
        totalCreditClose += Math.abs(acc.balance);
      } else if (acc.balance < 0) {
        // Credit balance (liability) → debit to close
        closeTransactions.push({
          entry_id: closingEntry.id,
          account_code: acc.account_code,
          movement_type: 'debit',
          amount: Math.abs(acc.balance),
          description: 'Cierre',
          line_number: lineNumber++,
        });
        totalDebitClose += Math.abs(acc.balance);
      }
    }

    // Counterpart to 139 (Closing balance)
    const diff = Math.abs(totalDebitClose - totalCreditClose);
    if (diff > 0.01) {
      if (totalDebitClose > totalCreditClose) {
        closeTransactions.push({
          entry_id: closingEntry.id,
          account_code: '1390000',
          movement_type: 'credit',
          amount: diff,
          description: 'Cierre de balance',
          line_number: lineNumber++,
        });
        totalCreditClose += diff;
      } else {
        closeTransactions.push({
          entry_id: closingEntry.id,
          account_code: '1390000',
          movement_type: 'debit',
          amount: diff,
          description: 'Cierre de balance',
          line_number: lineNumber++,
        });
        totalDebitClose += diff;
      }
    }

    // Insert closing transactions
    const { error: closeTransError } = await supabase
      .from('accounting_transactions')
      .insert(closeTransactions);

    if (closeTransError) {
      console.error('[close-fiscal-year] Error creating close transactions:', closeTransError);
      // Rollback: delete entries
      await supabase
        .from('accounting_entries')
        .delete()
        .in('id', [regularizationEntry.id, closingEntry.id]);
      throw new Error(`Error al crear transacciones de cierre: ${closeTransError.message}`);
    }

    // Update closing entry totals
    await supabase
      .from('accounting_entries')
      .update({
        total_debit: totalDebitClose,
        total_credit: totalCreditClose,
      })
      .eq('id', closingEntry.id);

    console.log(`[close-fiscal-year] Closing entry completed: ${closeTransactions.length} lines`);

    // ========================================================================
    // STEP 4: Mark fiscal year as closed
    // ========================================================================

    const { error: updateError } = await supabase
      .from('fiscal_years')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id,
      })
      .eq('id', fiscalYearId);

    if (updateError) {
      console.error('[close-fiscal-year] Error updating fiscal year:', updateError);
      throw new Error(`Error al actualizar ejercicio: ${updateError.message}`);
    }

    console.log(`[close-fiscal-year] ✅ Fiscal year closed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        regularization_entry_id: regularizationEntry.id,
        closing_entry_id: closingEntry.id,
        result_amount: Math.round(result * 100) / 100,
        message:
          result > 0
            ? `Beneficio de ${result.toFixed(2)}€`
            : result < 0
            ? `Pérdida de ${Math.abs(result).toFixed(2)}€`
            : 'Resultado neutro',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[close-fiscal-year] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
