import { supabase } from "@/integrations/supabase/client";

export interface MigrationSummary {
  header: {
    fiscalYear: number;
    centroCode: string;
    centroName: string;
    startDate: string;
    endDate: string;
    closingDate?: string;
    generatedAt: string;
    generatedBy: string;
  };
  
  sections: {
    apertura: {
      entryNumber: string;
      date: string;
      debit: number;
      credit: number;
    } | null;
    
    diario: {
      entriesCount: number;
      totalDebit: number;
      totalCredit: number;
      dateRange: { min: string; max: string };
    };
    
    iva: {
      emitidas: { count: number; base: number; vat: number };
      recibidas: { count: number; base: number; vat: number };
      netVAT: number;
    };
    
    bancos: {
      movementsCount: number;
      totalAmount: number;
    };
    
    validations: {
      errorsCount: number;
      warningsCount: number;
    };
  };
  
  logs: Array<{
    step: string;
    severity: string;
    message: string;
    timestamp: string;
  }>;
}

export async function generateMigrationSummary(
  fiscalYearId: string
): Promise<MigrationSummary> {
  // 1. Get fiscal year metrics
  const { data: metricsData, error: metricsError } = await (supabase.rpc as any)(
    "get_fiscal_year_metrics",
    { p_fiscal_year_id: fiscalYearId }
  );

  if (metricsError) throw metricsError;
  if (!metricsData || !Array.isArray(metricsData) || metricsData.length === 0) {
    throw new Error("No data found for fiscal year");
  }

  const metrics = metricsData[0];

  // 2. Get centro name
  const { data: centreData } = await supabase
    .from("centres")
    .select("nombre")
    .eq("codigo", metrics.centro_code)
    .single();

  // 3. Get apertura entry
  const { data: aperturaData } = await supabase
    .from("accounting_entries")
    .select("entry_number, entry_date, total_debit, total_credit")
    .eq("fiscal_year_id", fiscalYearId)
    .ilike("description", "%APERTURA%")
    .order("entry_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 4. Get date range for diario
  const { data: dateRangeData } = await supabase
    .from("accounting_entries")
    .select("entry_date")
    .eq("fiscal_year_id", fiscalYearId)
    .not("description", "ilike", "%APERTURA%")
    .order("entry_date", { ascending: true });

  const dateRange = dateRangeData && dateRangeData.length > 0
    ? {
        min: dateRangeData[0].entry_date,
        max: dateRangeData[dateRangeData.length - 1].entry_date,
      }
    : { min: metrics.start_date, max: metrics.end_date };

  // 5. Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // 6. Generate logs from accounting entries as a summary
  const logs: Array<{
    step: string;
    severity: string;
    message: string;
    timestamp: string;
  }> = [];

  // Add apertura log
  if (aperturaData) {
    logs.push({
      step: "apertura",
      severity: "success",
      message: `Asiento de apertura #${aperturaData.entry_number} importado correctamente`,
      timestamp: aperturaData.entry_date,
    });
  }

  // Add diario log
  if (metrics.total_entries > 0) {
    logs.push({
      step: "diario",
      severity: "success",
      message: `${metrics.total_entries} asientos importados al diario`,
      timestamp: metrics.first_entry_date || metrics.start_date,
    });
  }

  // Add IVA logs
  if (metrics.iva_emitidas_count > 0) {
    logs.push({
      step: "iva",
      severity: "success",
      message: `${metrics.iva_emitidas_count} facturas emitidas importadas`,
      timestamp: metrics.start_date,
    });
  }

  if (metrics.iva_recibidas_count > 0) {
    logs.push({
      step: "iva",
      severity: "success",
      message: `${metrics.iva_recibidas_count} facturas recibidas importadas`,
      timestamp: metrics.start_date,
    });
  }

  // Add bank logs
  if (metrics.bank_movements_count > 0) {
    logs.push({
      step: "bancos",
      severity: "success",
      message: `${metrics.bank_movements_count} movimientos bancarios importados`,
      timestamp: metrics.start_date,
    });
  }

  // Add validation warnings if any
  if (metrics.warnings_count > 0) {
    logs.push({
      step: "validaciones",
      severity: "warning",
      message: `${metrics.warnings_count} advertencias encontradas`,
      timestamp: new Date().toISOString(),
    });
  }

  if (metrics.errors_count > 0) {
    logs.push({
      step: "validaciones",
      severity: "error",
      message: `${metrics.errors_count} errores encontrados`,
      timestamp: new Date().toISOString(),
    });
  }

  const summary: MigrationSummary = {
    header: {
      fiscalYear: metrics.year,
      centroCode: metrics.centro_code,
      centroName: centreData?.nombre || metrics.centro_code,
      startDate: metrics.start_date,
      endDate: metrics.end_date,
      closingDate: metrics.closing_date,
      generatedAt: new Date().toISOString(),
      generatedBy: user?.email || "Sistema",
    },
    sections: {
      apertura: aperturaData
        ? {
            entryNumber: aperturaData.entry_number.toString(),
            date: aperturaData.entry_date,
            debit: Number(aperturaData.total_debit),
            credit: Number(aperturaData.total_credit),
          }
        : null,
      diario: {
        entriesCount: Number(metrics.total_entries) - (aperturaData ? 1 : 0),
        totalDebit: Number(metrics.total_debit),
        totalCredit: Number(metrics.total_credit),
        dateRange,
      },
      iva: {
        emitidas: {
          count: Number(metrics.iva_emitidas_count),
          base: Number(metrics.iva_emitidas_base),
          vat: Number(metrics.iva_emitidas_vat),
        },
        recibidas: {
          count: Number(metrics.iva_recibidas_count),
          base: Number(metrics.iva_recibidas_base),
          vat: Number(metrics.iva_recibidas_vat),
        },
        netVAT: Number(metrics.net_vat),
      },
      bancos: {
        movementsCount: Number(metrics.bank_movements_count),
        totalAmount: Number(metrics.bank_movements_total),
      },
      validations: {
        errorsCount: Number(metrics.errors_count),
        warningsCount: Number(metrics.warnings_count),
      },
    },
    logs,
  };

  return summary;
}
