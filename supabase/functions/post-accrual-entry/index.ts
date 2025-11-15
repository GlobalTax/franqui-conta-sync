// ============================================================================
// EDGE FUNCTION: post-accrual-entry
// Purpose: Contabiliza un asiento periódico específico
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Accrual {
  id: string;
  centro_code: string;
  accrual_type: "income" | "expense";
  account_code: string;
  counterpart_account: string;
  description: string;
}

interface AccrualEntry {
  id: string;
  accrual_id: string;
  period_date: string;
  amount: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Obtener user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Usuario no autenticado");
    }

    const { entryId, accrualId } = await req.json();

    if (!entryId || !accrualId) {
      throw new Error("entryId y accrualId son requeridos");
    }

    // Obtener entry y accrual
    const { data: entry, error: entryError } = await supabase
      .from("accrual_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    if (entryError) throw entryError;

    const { data: accrual, error: accrualError } = await supabase
      .from("accruals")
      .select("*")
      .eq("id", accrualId)
      .single();

    if (accrualError) throw accrualError;

    const typedEntry = entry as AccrualEntry;
    const typedAccrual = accrual as Accrual;

    // Obtener ejercicio fiscal
    const { data: fiscalYear, error: fyError } = await supabase
      .from("fiscal_years")
      .select("id")
      .eq("centro_code", typedAccrual.centro_code)
      .lte("start_date", typedEntry.period_date)
      .gte("end_date", typedEntry.period_date)
      .single();

    if (fyError) throw new Error("No se encontró ejercicio fiscal para esta fecha");

    // Obtener siguiente número de asiento
    const { count } = await supabase
      .from("accounting_entries")
      .select("*", { count: "exact", head: true })
      .eq("fiscal_year_id", fiscalYear.id);

    const nextEntryNumber = (count || 0) + 1;

    // Crear asiento contable
    const { data: accountingEntry, error: aeError } = await supabase
      .from("accounting_entries")
      .insert({
        centro_code: typedAccrual.centro_code,
        fiscal_year_id: fiscalYear.id,
        entry_number: nextEntryNumber,
        entry_date: typedEntry.period_date,
        description: `Periodificación: ${typedAccrual.description}`,
        status: "posted",
        total_debit: typedEntry.amount,
        total_credit: typedEntry.amount,
        created_by: user.id,
        posted_by: user.id,
        posted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (aeError) throw aeError;

    // Crear transacciones según tipo
    const transactions = [];

    if (typedAccrual.accrual_type === "expense") {
      // Gasto: DEBE Gasto (6XX) / HABER 480
      transactions.push(
        {
          entry_id: accountingEntry.id,
          account_code: typedAccrual.account_code,
          movement_type: "debit" as const,
          amount: typedEntry.amount,
          line_number: 1,
        },
        {
          entry_id: accountingEntry.id,
          account_code: typedAccrual.counterpart_account,
          movement_type: "credit" as const,
          amount: typedEntry.amount,
          line_number: 2,
        }
      );
    } else {
      // Ingreso: DEBE 485 / HABER Ingreso (7XX)
      transactions.push(
        {
          entry_id: accountingEntry.id,
          account_code: typedAccrual.counterpart_account,
          movement_type: "debit" as const,
          amount: typedEntry.amount,
          line_number: 1,
        },
        {
          entry_id: accountingEntry.id,
          account_code: typedAccrual.account_code,
          movement_type: "credit" as const,
          amount: typedEntry.amount,
          line_number: 2,
        }
      );
    }

    const { error: txError } = await supabase
      .from("accounting_transactions")
      .insert(transactions);

    if (txError) throw txError;

    // Actualizar entrada como contabilizada
    const { error: updateError } = await supabase
      .from("accrual_entries")
      .update({
        status: "posted",
        accounting_entry_id: accountingEntry.id,
      })
      .eq("id", entryId);

    if (updateError) throw updateError;

    console.log(`✅ Asiento periódico ${entryId} contabilizado: ${accountingEntry.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        accounting_entry_id: accountingEntry.id,
        entry_number: nextEntryNumber,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
