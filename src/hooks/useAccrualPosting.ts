// ============================================================================
// HOOK: useAccrualPosting - Generación automática de asientos de periodificación
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateAccrualEntriesParams {
  accrualId: string;
}

interface PostAccrualEntryParams {
  entryId: string;
  accrualId: string;
}

export const useAccrualPosting = () => {
  const queryClient = useQueryClient();

  // Generar todos los asientos periódicos de una periodificación
  const generateMutation = useMutation({
    mutationFn: async ({ accrualId }: GenerateAccrualEntriesParams) => {
      const { data, error } = await supabase.functions.invoke("generate-accrual-entries", {
        body: { accrualId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accrual-entries"] });
      toast.success(`✅ ${data.entries_generated} asientos periódicos generados`);
    },
    onError: (error: Error) => {
      toast.error(`Error al generar asientos: ${error.message}`);
    },
  });

  // Contabilizar un asiento periódico específico
  const postMutation = useMutation({
    mutationFn: async ({ entryId, accrualId }: PostAccrualEntryParams) => {
      const { data, error } = await supabase.functions.invoke("post-accrual-entry", {
        body: { entryId, accrualId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accrual-entries"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      toast.success("Asiento contabilizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al contabilizar: ${error.message}`);
    },
  });

  return {
    generateEntries: generateMutation.mutateAsync,
    postEntry: postMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    isPosting: postMutation.isPending,
  };
};
