// ============================================================================
// EDGE FUNCTION: post-provision-entry
// Contabiliza una provisión creando el asiento DEBE gasto / HABER provisión
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

    const { provisionId } = await req.json();

    if (!provisionId) {
      throw new Error("provisionId es requerido");
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

    if (provision.status !== "draft") {
      throw new Error("La provisión ya ha sido contabilizada");
    }

    // 2. Obtener el siguiente número de asiento
    const { count } = await supabase
      .from("accounting_entries")
      .select("*", { count: "exact", head: true })
      .eq("centro_code", provision.centro_code);

    const entryNumber = (count || 0) + 1;

    // 3. Crear el asiento contable
    const { data: entry, error: entryError } = await supabase
      .from("accounting_entries")
      .insert({
        centro_code: provision.centro_code,
        entry_number: entryNumber,
        entry_date: provision.provision_date,
        description: `Provisión: ${provision.description}`,
        status: "posted",
        total_debit: provision.amount,
        total_credit: provision.amount,
      })
      .select()
      .single();

    if (entryError || !entry) {
      throw new Error("Error al crear el asiento contable");
    }

    // 4. Crear las transacciones (DEBE gasto / HABER provisión)
    const transactions = [
      {
        entry_id: entry.id,
        account_code: provision.expense_account,
        movement_type: "debit",
        amount: provision.amount,
        description: provision.supplier_name,
        line_number: 1,
      },
      {
        entry_id: entry.id,
        account_code: provision.provision_account,
        movement_type: "credit",
        amount: provision.amount,
        description: provision.supplier_name,
        line_number: 2,
      },
    ];

    const { error: txError } = await supabase
      .from("accounting_transactions")
      .insert(transactions);

    if (txError) {
      // Rollback: eliminar el asiento si falla la inserción de transacciones
      await supabase.from("accounting_entries").delete().eq("id", entry.id);
      throw new Error("Error al crear las transacciones");
    }

    // 5. Actualizar la provisión
    const { error: updateError } = await supabase
      .from("provisions")
      .update({
        status: "active",
        accounting_entry_id: entry.id,
      })
      .eq("id", provisionId);

    if (updateError) {
      throw new Error("Error al actualizar el estado de la provisión");
    }

    console.log(`✅ Provisión ${provision.provision_number} contabilizada - Asiento ${entryNumber}`);

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
    console.error("❌ Error en post-provision-entry:", error);

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
