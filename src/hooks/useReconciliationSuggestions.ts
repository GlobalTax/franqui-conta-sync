import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReconciliationSuggestion {
  matched_id: string;
  matched_type: string;
  invoice_number?: string;
  supplier_name?: string;
  customer_name?: string;
  description?: string;
  amount: number;
  document_date: string;
  document_number?: string;
  confidence_score: number;
  match_reason: string;
}

/**
 * FASE 4: Hook actualizado para usar suggest_reconciliation_matches RPC
 */
export const useReconciliationSuggestions = (
  transactionId: string | null, 
  centroCode: string | null
) => {
  return useQuery({
    queryKey: ["reconciliation-suggestions", transactionId, centroCode],
    queryFn: async () => {
      if (!transactionId || !centroCode) return [];

      // Llamar RPC para generar sugerencias dinámicas
      const { data, error } = await supabase.rpc('suggest_reconciliation_matches', {
        p_transaction_id: transactionId,
        p_centro_code: centroCode,
      });

      if (error) {
        console.error('[useReconciliationSuggestions] Error:', error);
        throw error;
      }

      // Castear data al tipo esperado (primero a unknown para evitar error de tipo)
      const result = data as unknown as { success: boolean; suggestions: ReconciliationSuggestion[]; error?: string } | null;

      if (!result?.success) {
        console.error('[useReconciliationSuggestions] RPC failed:', result?.error);
        return [];
      }

      return result.suggestions as ReconciliationSuggestion[];
    },
    enabled: !!transactionId && !!centroCode,
  });
};
