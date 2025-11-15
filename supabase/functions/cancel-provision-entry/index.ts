// ============================================================================
// EDGE FUNCTION: cancel-provision-entry
// Cancela una provisión reversando el asiento contable
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

    const { provisionId, reason, invoiceId } = await req.json();

    if (!provisionId || !reason) {
      throw new Error("provisionId y reason son requeridos");
    }

    // 1. Obtener la provisión
    const { data: provision, error: provisionError } = await supabase
      .from("provisions")
      .select("*")
      .eq("id", provisionId)
      .single();

    if (provisionError || !provision) {
      throw new Error("Provisión no encontrada");
    }

    if (provision.status !== "active") {
      throw new Error("La provisión no está activa");
    }

    // 2. Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Obtener el siguiente número de asiento para la reversión
    const { count } = await supabase
      .from("accounting_entries")
      .select("*", { count: "exact", head: true })
      .eq("centro_code", provision.centro_code);

    const entryNumber = (count || 0) + 1;

    // 4. Crear asiento de reversión (invertir DEBE y HABER)
    const { data: reversalEntry, error: entryError } = await supabase
      .from("accounting_entries")
      .insert({
        centro_code: provision.centro_code,
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split("T")[0],
        description: `Reversión provisión: ${provision.description} - ${reason}`,
        status: "posted",
        total_debit: provision.amount,
        total_credit: provision.amount,
      })
      .select()
      .single();

    if (entryError || !reversalEntry) {
      throw new Error("Error al crear el asiento de reversión");
    }

    // 5. Crear transacciones de reversión (invertidas)
    const reversalTransactions = [
      {
        entry_id: reversalEntry.id,
        account_code: provision.provision_account,
        movement_type: "debit",
        amount: provision.amount,
        description: `Reversión: ${provision.supplier_name}`,
        line_number: 1,
      },
      {
        entry_id: reversalEntry.id,
        account_code: provision.expense_account,
        movement_type: "credit",
        amount: provision.amount,
        description: `Reversión: ${provision.supplier_name}`,
        line_number: 2,
      },
    ];

    const { error: txError } = await supabase
      .from("accounting_transactions")
      .insert(reversalTransactions);

    if (txError) {
      // Rollback
      await supabase.from("accounting_entries").delete().eq("id", reversalEntry.id);
      throw new Error("Error al crear las transacciones de reversión");
    }

    // 6. Actualizar la provisión
    const newStatus = invoiceId ? "invoiced" : "cancelled";

    const { error: updateError } = await supabase
      .from("provisions")
      .update({
        status: newStatus,
        reversal_entry_id: reversalEntry.id,
        invoice_id: invoiceId || null,
        cancelled_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id || null,
      })
      .eq("id", provisionId);

    if (updateError) {
      throw new Error("Error al actualizar el estado de la provisión");
    }

    console.log(`✅ Provisión ${provision.provision_number} cancelada - Asiento reversión ${entryNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        reversal_entry_id: reversalEntry.id,
        reversal_entry_number: entryNumber,
        status: newStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error en cancel-provision-entry:", error);

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
