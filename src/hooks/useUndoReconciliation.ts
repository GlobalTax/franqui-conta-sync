// ============================================================================
// FASE 6: Hook para deshacer conciliaciones
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UndoReconciliationParams {
  transactionId: string;
}

export const useUndoReconciliation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId }: UndoReconciliationParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc('undo_reconciliation', {
        p_transaction_id: transactionId,
        p_user_id: user.id,
      });

      if (error) throw error;

      // Castear data al tipo esperado
      const result = data as { success: boolean; message?: string; error?: string } | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Error al deshacer conciliación');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-suggestions"] });
      
      toast.success("Conciliación deshecha", {
        description: data?.message || "La transacción volvió a estado pendiente",
      });
    },
    onError: (error: Error) => {
      console.error("[useUndoReconciliation] Error:", error);
      toast.error("Error al deshacer conciliación", {
        description: error.message,
      });
    },
  });
};
