// ============================================================================
// EDGE FUNCTION: post-inventory-closure
// Contabiliza un cierre de existencias creando asientos según tipo (global/detailed)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { closureId } = await req.json();

    if (!closureId) {
      throw new Error("closureId es requerido");
    }

    // 1. Obtener el cierre de existencias con sus líneas
    const { data: closure, error: closureError } = await supabase
      .from("inventory_closures")
      .select("*, lines:inventory_closure_lines(*)")
      .eq("id", closureId)
      .single();

    if (closureError || !closure) {
      throw new Error("Cierre de existencias no encontrado");
    }

    if (closure.status !== "draft") {
      throw new Error("El cierre ya ha sido contabilizado");
    }

    // 2. Obtener el siguiente número de asiento
    const { count } = await supabase
      .from("accounting_entries")
      .select("*", { count: "exact", head: true })
      .eq("centro_code", closure.centro_code);

    const entryNumber = (count || 0) + 1;

    // 3. Crear el asiento contable
    const { data: entry, error: entryError } = await supabase
      .from("accounting_entries")
      .insert({
        centro_code: closure.centro_code,
        entry_number: entryNumber,
        entry_date: `${closure.closure_year}-${String(closure.closure_month).padStart(2, '0')}-28`,
        description: `Cierre existencias ${closure.closure_month}/${closure.closure_year}`,
        status: "posted",
        total_debit: closure.entry_type === "global" ? Math.abs(closure.total_amount || 0) : 0,
        total_credit: closure.entry_type === "global" ? Math.abs(closure.total_amount || 0) : 0,
      })
      .select()
      .single();

    if (entryError || !entry) {
      throw new Error("Error al crear el asiento contable");
    }

    // 4. Crear las transacciones según el tipo
    let transactions = [];

    if (closure.entry_type === "global") {
      // Asiento global: una línea de variación de existencias
      const amount = Math.abs(closure.total_amount || 0);
      const isPositive = (closure.total_amount || 0) >= 0;

      transactions = [
        {
          entry_id: entry.id,
          account_code: isPositive ? "3000000" : "6100000", // Existencias o Variación
          movement_type: "debit",
          amount: amount,
          description: `Cierre existencias ${closure.closure_month}/${closure.closure_year}`,
          line_number: 1,
        },
        {
          entry_id: entry.id,
          account_code: isPositive ? "6100000" : "3000000", // Variación o Existencias
          movement_type: "credit",
          amount: amount,
          description: `Cierre existencias ${closure.closure_month}/${closure.closure_year}`,
          line_number: 2,
        },
      ];
    } else {
      // Asiento detallado: una línea por cada item
      let lineNumber = 1;
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of closure.lines || []) {
        const variation = line.final_stock - line.initial_stock;
        const amount = Math.abs(variation);

        if (amount === 0) continue;

        const isPositive = variation > 0;
        const stockAccount = line.account_code || "3000000";
        const variationAccount = line.variation_account || "6100000";

        // Línea de debe
        transactions.push({
          entry_id: entry.id,
          account_code: isPositive ? stockAccount : variationAccount,
          movement_type: "debit",
          amount: amount,
          description: line.description,
          line_number: lineNumber++,
        });

        // Línea de haber
        transactions.push({
          entry_id: entry.id,
          account_code: isPositive ? variationAccount : stockAccount,
          movement_type: "credit",
          amount: amount,
          description: line.description,
          line_number: lineNumber++,
        });

        totalDebit += amount;
        totalCredit += amount;
      }

      // Actualizar totales del asiento
      await supabase
        .from("accounting_entries")
        .update({
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .eq("id", entry.id);
    }

    const { error: txError } = await supabase
      .from("accounting_transactions")
      .insert(transactions);

    if (txError) {
      // Rollback: eliminar el asiento si falla la inserción de transacciones
      await supabase.from("accounting_entries").delete().eq("id", entry.id);
      throw new Error("Error al crear las transacciones");
    }

    // 5. Actualizar el cierre
    const { error: updateError } = await supabase
      .from("inventory_closures")
      .update({
        status: "posted",
        accounting_entry_id: entry.id,
        posted_at: new Date().toISOString(),
      })
      .eq("id", closureId);

    if (updateError) {
      throw new Error("Error al actualizar el estado del cierre");
    }

    console.log(`✅ Cierre existencias ${closure.closure_month}/${closure.closure_year} contabilizado - Asiento ${entryNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        entry_id: entry.id,
        entry_number: entryNumber,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error en post-inventory-closure:", error);

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
