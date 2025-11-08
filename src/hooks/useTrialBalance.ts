import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  level: number;
  parent_code: string | null;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export const useTrialBalance = (
  centroCode: string | undefined,
  companyId: string | undefined,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ["trial-balance", centroCode, companyId, startDate, endDate],
    queryFn: async () => {
      if (!centroCode) {
        throw new Error("Centro code is required");
      }

      const { data, error } = await supabase.rpc("calculate_trial_balance", {
        p_centro_code: centroCode,
        p_company_id: companyId || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) throw error;
      return (data || []) as TrialBalanceRow[];
    },
    enabled: !!centroCode,
  });
};
