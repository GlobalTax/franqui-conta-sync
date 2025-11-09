import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PostEntryUseCase } from "@/domain/accounting/use-cases/PostEntry";

interface PostEntryParams {
  entryId: string;
}

interface UnpostEntryParams {
  entryId: string;
  motivo: string;
}

export const usePostEntry = () => {
  const queryClient = useQueryClient();
  const postEntryUseCase = new PostEntryUseCase();

  const postEntry = useMutation({
    mutationFn: async ({ entryId }: PostEntryParams) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuario no autenticado");

      return await postEntryUseCase.execute({
        entryId,
        userId: userData.user.id,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al contabilizar el asiento");
    },
  });

  const unpostEntry = useMutation({
    mutationFn: async ({ entryId, motivo }: UnpostEntryParams) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc("descontabilizar_asiento" as any, {
        p_entry_id: entryId,
        p_user_id: userData.user.id,
        p_motivo: motivo,
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      toast.success(data.message || "Asiento descontabilizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al descontabilizar el asiento");
    },
  });

  return {
    postEntry: postEntry.mutate,
    unpostEntry: unpostEntry.mutate,
    isPosting: postEntry.isPending,
    isUnposting: unpostEntry.isPending,
  };
};
