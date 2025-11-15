// ============================================================================
// HOOK: useProvisionTemplates - Gestión de plantillas de provisiones
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useView } from "@/contexts/ViewContext";

export interface ProvisionTemplate {
  id: string;
  centro_code: string;
  template_name: string;
  description?: string;
  expense_account: string;
  provision_account: string;
  default_amount?: number;
  supplier_name?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useProvisionTemplates = () => {
  const { selectedView } = useView();
  const queryClient = useQueryClient();

  const templates = useQuery({
    queryKey: ["provision-templates", selectedView?.id],
    queryFn: async () => {
      if (!selectedView) return [];

      const { data, error } = await supabase
        .from("provision_templates")
        .select("*")
        .eq("centro_code", selectedView.code || selectedView.id)
        .eq("is_active", true)
        .order("template_name", { ascending: true });

      if (error) throw error;
      return data as ProvisionTemplate[];
    },
    enabled: !!selectedView,
  });

  const createMutation = useMutation({
    mutationFn: async (newTemplate: Omit<ProvisionTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("provision_templates")
        .insert(newTemplate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provision-templates"] });
      toast.success("Plantilla creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear plantilla: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProvisionTemplate> }) => {
      const { data, error } = await supabase
        .from("provision_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provision-templates"] });
      toast.success("Plantilla actualizada");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("provision_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provision-templates"] });
      toast.success("Plantilla eliminada");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    templates: templates.data || [],
    isLoading: templates.isLoading,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
  };
};
