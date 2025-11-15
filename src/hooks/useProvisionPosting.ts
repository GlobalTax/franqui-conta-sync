// ============================================================================
// HOOK: useProvisionPosting - Contabilización y cancelación de provisiones
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostProvisionParams {
  provisionId: string;
}

interface CancelProvisionParams {
  provisionId: string;
  reason: string;
  invoiceId?: string;
}

export const useProvisionPosting = () => {
  const queryClient = useQueryClient();

  // Contabilizar provisión (crear asiento DEBE gasto / HABER provisión)
  const postMutation = useMutation({
    mutationFn: async ({ provisionId }: PostProvisionParams) => {
      const { data, error } = await supabase.functions.invoke("post-provision-entry", {
        body: { provisionId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provisions"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      toast.success("Provisión contabilizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al contabilizar: ${error.message}`);
    },
  });

  // Cancelar provisión (reversar asiento)
  const cancelMutation = useMutation({
    mutationFn: async ({ provisionId, reason, invoiceId }: CancelProvisionParams) => {
      const { data, error } = await supabase.functions.invoke("cancel-provision-entry", {
        body: { provisionId, reason, invoiceId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["provisions"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      const message = variables.invoiceId 
        ? "Provisión cancelada y vinculada a factura"
        : "Provisión cancelada correctamente";
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(`Error al cancelar: ${error.message}`);
    },
  });

  return {
    postProvision: postMutation.mutateAsync,
    cancelProvision: cancelMutation.mutateAsync,
    isPosting: postMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
};
