import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReconciliationSuggestion {
  id: string;
  bank_transaction_id: string;
  accounting_entry_id?: string;
  invoice_id?: string;
  daily_closure_id?: string;
  match_type: "automatic" | "suggested";
  confidence_score: number;
  match_reason?: string;
  amount?: number;
  document_date?: string;
  document_number?: string;
  document_type?: string;
  supplier_name?: string;
}

export const useReconciliationSuggestions = (transactionId: string | null) => {
  return useQuery({
    queryKey: ["reconciliation-suggestions", transactionId],
    queryFn: async () => {
      if (!transactionId) return [];

      // Get existing reconciliation matches
      const { data: matches, error } = await supabase
        .from("reconciliation_matches")
        .select("*")
        .eq("transaction_id", transactionId)
        .eq("status", "pending")
        .order("confidence_score", { ascending: false });

      if (error) throw error;

      // Transform to match interface
      const suggestions: ReconciliationSuggestion[] =
        matches?.map((m) => ({
          id: m.id,
          bank_transaction_id: m.transaction_id,
          accounting_entry_id: m.match_id,
          invoice_id: undefined,
          daily_closure_id: undefined,
          match_type: m.match_type === "automatic" ? "automatic" : "suggested",
          confidence_score: m.confidence_score || 0,
          match_reason: JSON.stringify(m.matching_rules) || undefined,
          amount: undefined,
          document_date: undefined,
          document_number: undefined,
          document_type: "entry",
          supplier_name: undefined,
        })) || [];

      return suggestions;
    },
    enabled: !!transactionId,
  });
};
