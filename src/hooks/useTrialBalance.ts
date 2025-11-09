import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NivelPGC } from "@/types/pgc-reports";

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  nivel: number;
  parent_code: string | null;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export const useTrialBalance = (
  centroCode: string | undefined,
  companyId: string | undefined,
  startDate?: string,
  endDate?: string,
  nivel: NivelPGC = 3,
  showZeroBalance: boolean = true
) => {
  return useQuery({
    queryKey: ["trial-balance", centroCode, companyId, startDate, endDate, nivel, showZeroBalance],
    queryFn: async () => {
      if (!centroCode) {
        throw new Error("Centro code is required");
      }

      const { data, error } = await supabase.rpc("calculate_trial_balance_full", {
        p_centro_code: centroCode,
        p_company_id: companyId || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_nivel: nivel,
        p_show_zero_balance: showZeroBalance
      });

      if (error) throw error;
      const rawData = (data || []) as any[];
      return rawData.map(item => ({
        account_code: item.account_code,
        account_name: item.account_name,
        account_type: item.account_type,
        nivel: item.level,
        parent_code: item.parent_code,
        debit_total: item.debit_total,
        credit_total: item.credit_total,
        balance: item.balance
      }));
    },
    enabled: !!centroCode,
  });
};
