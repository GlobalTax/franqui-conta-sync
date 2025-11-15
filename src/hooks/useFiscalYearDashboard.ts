import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyBreakdown {
  month: string;
  month_name: string;
  entries: number;
  debit: number;
  credit: number;
}

export interface FiscalYearDashboardData {
  overview: {
    fiscalYearId: string;
    year: number;
    centroCode: string;
    status: string;
    startDate: string;
    endDate: string;
    closingDate?: string;
  };
  
  accounting: {
    totalEntries: number;
    totalDebit: number;
    totalCredit: number;
    balanceDifference: number;
    isBalanced: boolean;
  };
  
  vat: {
    emitidas: { count: number; base: number; vat: number };
    recibidas: { count: number; base: number; vat: number };
    netVAT: number;
  };
  
  banking: {
    movementsCount: number;
    movementsTotal: number;
  };
  
  migration: {
    logsCount: number;
    errorsCount: number;
    warningsCount: number;
    firstEntryDate?: string;
    lastEntryDate?: string;
  };
  
  monthlyBreakdown: MonthlyBreakdown[];
}

export function useFiscalYearDashboard(fiscalYearId: string | undefined) {
  return useQuery({
    queryKey: ["fiscal-year-dashboard", fiscalYearId],
    queryFn: async () => {
      if (!fiscalYearId) {
        throw new Error("Fiscal year ID is required");
      }

      const { data, error } = await (supabase.rpc as any)("get_fiscal_year_metrics", {
        p_fiscal_year_id: fiscalYearId,
      });

      if (error) throw error;
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("No data found for fiscal year");
      }

      const row = data[0];

      // Parse monthly breakdown from JSONB
      const monthlyBreakdown: MonthlyBreakdown[] = 
        typeof row.monthly_breakdown === "string"
          ? JSON.parse(row.monthly_breakdown)
          : row.monthly_breakdown || [];

      const result: FiscalYearDashboardData = {
        overview: {
          fiscalYearId: row.fiscal_year_id,
          year: row.year,
          centroCode: row.centro_code,
          status: row.status,
          startDate: row.start_date,
          endDate: row.end_date,
          closingDate: row.closing_date,
        },
        accounting: {
          totalEntries: Number(row.total_entries),
          totalDebit: Number(row.total_debit),
          totalCredit: Number(row.total_credit),
          balanceDifference: Number(row.balance_difference),
          isBalanced: row.is_balanced,
        },
        vat: {
          emitidas: {
            count: Number(row.iva_emitidas_count),
            base: Number(row.iva_emitidas_base),
            vat: Number(row.iva_emitidas_vat),
          },
          recibidas: {
            count: Number(row.iva_recibidas_count),
            base: Number(row.iva_recibidas_base),
            vat: Number(row.iva_recibidas_vat),
          },
          netVAT: Number(row.net_vat),
        },
        banking: {
          movementsCount: Number(row.bank_movements_count),
          movementsTotal: Number(row.bank_movements_total),
        },
        migration: {
          logsCount: Number(row.migration_logs_count),
          errorsCount: Number(row.errors_count),
          warningsCount: Number(row.warnings_count),
          firstEntryDate: row.first_entry_date,
          lastEntryDate: row.last_entry_date,
        },
        monthlyBreakdown,
      };

      return result;
    },
    enabled: !!fiscalYearId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
