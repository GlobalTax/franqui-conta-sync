// ============================================================================
// EDGE FUNCTION: generate-accrual-entries
// Purpose: Genera todos los asientos periódicos de una periodificación
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Accrual {
  id: string;
  centro_code: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  frequency: "monthly" | "quarterly" | "annual";
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

    const { accrualId } = await req.json();

    if (!accrualId) {
      throw new Error("accrualId es requerido");
    }

    // Obtener la periodificación
    const { data: accrual, error: accrualError } = await supabase
      .from("accruals")
      .select("*")
      .eq("id", accrualId)
      .single();

    if (accrualError) throw accrualError;
    if (!accrual) throw new Error("Periodificación no encontrada");

    const typedAccrual = accrual as Accrual;

    // Calcular periodos según frecuencia
    const startDate = new Date(typedAccrual.start_date);
    const endDate = new Date(typedAccrual.end_date);
    
    const entries = [];
    let currentDate = new Date(startDate);
    let periodCount = 0;

    // Calcular número de periodos
    while (currentDate <= endDate) {
      periodCount++;
      
      if (typedAccrual.frequency === "monthly") {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (typedAccrual.frequency === "quarterly") {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }

    // Calcular importe por periodo
    const amountPerPeriod = typedAccrual.total_amount / periodCount;

    // Generar entradas
    currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      entries.push({
        accrual_id: accrualId,
        period_date: currentDate.toISOString().split("T")[0],
        period_year: currentDate.getFullYear(),
        period_month: currentDate.getMonth() + 1,
        amount: Math.round(amountPerPeriod * 100) / 100,
        status: "pending",
      });

      if (typedAccrual.frequency === "monthly") {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (typedAccrual.frequency === "quarterly") {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }

    // Insertar entradas en la BD
    const { error: insertError } = await supabase
      .from("accrual_entries")
      .insert(entries);

    if (insertError) throw insertError;

    console.log(`✅ Generados ${entries.length} asientos periódicos para ${accrualId}`);

    return new Response(
      JSON.stringify({
        success: true,
        entries_generated: entries.length,
        amount_per_period: amountPerPeriod,
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
