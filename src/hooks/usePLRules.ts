import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PLRule, CreatePLRuleInput, UpdatePLRuleInput } from "@/types/profit-loss";

/**
 * Hook para obtener reglas de una plantilla
 */
export const usePLRules = (templateId: string) => {
  return useQuery({
    queryKey: ["pl-rules", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pl_rules" as any)
        .select("*")
        .eq("template_id", templateId)
        .order("priority");

      if (error) throw error;
      return data as unknown as PLRule[];
    },
    enabled: !!templateId,
  });
};

/**
 * Hook para crear una nueva regla
 */
export const useCreatePLRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePLRuleInput) => {
      const { data, error } = await supabase
        .from("pl_rules" as any)
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pl-rules", variables.template_id] });
      queryClient.invalidateQueries({ queryKey: ["pl-report"] });
      toast.success("Regla creada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear regla: " + error.message);
    },
  });
};

/**
 * Hook para actualizar una regla existente
 */
export const useUpdatePLRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePLRuleInput) => {
      const { data, error } = await supabase
        .from("pl_rules" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["pl-rules", data.template_id] });
      queryClient.invalidateQueries({ queryKey: ["pl-report"] });
      toast.success("Regla actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar regla: " + error.message);
    },
  });
};

/**
 * Hook para eliminar una regla
 */
export const useDeletePLRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pl_rules" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pl-rules"] });
      queryClient.invalidateQueries({ queryKey: ["pl-report"] });
      toast.success("Regla eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar regla: " + error.message);
    },
  });
};
