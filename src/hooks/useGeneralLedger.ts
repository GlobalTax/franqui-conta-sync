import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LedgerLine {
  account_code: string;
  account_name: string;
  entry_date: string;
  entry_number: number;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export const useGeneralLedger = (
  centroCode: string,
  startDate: string,
  endDate: string,
  accountCode?: string
) => {
  return useQuery({
    queryKey: ["general-ledger", centroCode, startDate, endDate, accountCode],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_general_ledger", {
        p_centro_code: centroCode,
        p_start_date: startDate,
        p_end_date: endDate,
        p_account_code: accountCode || null,
      });

      if (error) throw error;

      return (data || []) as LedgerLine[];
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
};
