import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";

export interface LedgerLine {
  account_code: string;
  account_name: string;
  entry_date: string;
  entry_number: number;
  serie: string;
  description: string;
  document_ref: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export const useGeneralLedger = (
  viewSelection: ViewSelection | null,
  startDate: string,
  endDate: string,
  accountCode?: string,
  includeZeroBalance: boolean = false
) => {
  return useQuery({
    queryKey: ["general-ledger", viewSelection, startDate, endDate, accountCode, includeZeroBalance],
    queryFn: async () => {
      if (!viewSelection) return [];

      let allLines: LedgerLine[] = [];

      if (viewSelection.type === 'company') {
        // Vista consolidada: obtener datos de todos los centros
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        if (!centres || centres.length === 0) return [];

        const promises = centres.map(c =>
          supabase.rpc("get_general_ledger_full", {
            p_centro_code: c.codigo,
            p_start_date: startDate,
            p_end_date: endDate,
            p_account_code: accountCode || null,
            p_include_zero_balance: includeZeroBalance
          })
        );

        const results = await Promise.all(promises);
        allLines = results.flatMap(r => (r.data || []) as LedgerLine[]);
        
        // Ordenar por fecha y número de asiento
        allLines.sort((a, b) => {
          const dateCompare = a.entry_date.localeCompare(b.entry_date);
          if (dateCompare !== 0) return dateCompare;
          return a.entry_number - b.entry_number;
        });
      } else {
        // Vista individual
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", viewSelection.id)
          .single();

        if (!centre) return [];

        const { data, error } = await supabase.rpc("get_general_ledger_full", {
          p_centro_code: centre.codigo,
          p_start_date: startDate,
          p_end_date: endDate,
          p_account_code: accountCode || null,
          p_include_zero_balance: includeZeroBalance
        });

        if (error) throw error;
        allLines = (data || []) as LedgerLine[];
      }

      return allLines;
    },
    enabled: !!viewSelection && !!startDate && !!endDate,
  });
};
