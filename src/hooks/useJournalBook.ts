import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JournalLine {
  entry_id: string;
  entry_number: number;
  entry_date: string;
  description: string;
  account_code: string;
  account_name: string;
  line_number: number;
  movement_type: string;
  amount: number;
  total_debit: number;
  total_credit: number;
}

export const useJournalBook = (
  centroCode: string,
  startDate: string,
  endDate: string
) => {
  return useQuery({
    queryKey: ["journal-book", centroCode, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_journal_book", {
        p_centro_code: centroCode,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      return (data || []) as JournalLine[];
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
};
