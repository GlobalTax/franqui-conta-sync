// ============================================================================
// HOOK: useProvisions - Gestión de provisiones de gastos
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useView } from "@/contexts/ViewContext";

export interface Provision {
  id: string;
  centro_code: string;
  provision_number: string;
  provision_date: string;
  period_year: number;
  period_month: number;
  expense_account: string;
  provision_account: string;
  supplier_name: string;
  description: string;
  amount: number;
  status: 'draft' | 'active' | 'invoiced' | 'cancelled';
  accounting_entry_id?: string;
  reversal_entry_id?: string;
  invoice_id?: string;
  template_id?: string;
  notes?: string;
  cancelled_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useProvisions = () => {
  const { selectedView } = useView();
  const queryClient = useQueryClient();

  const provisions = useQuery({
    queryKey: ["provisions", selectedView?.id],
    queryFn: async () => {
      if (!selectedView) return [];

      const { data, error } = await supabase
        .from("provisions")
        .select("*")
        .eq("centro_code", selectedView.code || selectedView.id)
        .order("provision_date", { ascending: false });

      if (error) throw error;
      return data as Provision[];
    },
    enabled: !!selectedView,
  });

  const createMutation = useMutation({
    mutationFn: async (newProvision: Omit<Provision, "id" | "created_at" | "updated_at" | "provision_number">) => {
      // Generar número de provisión
      const { count } = await supabase
        .from("provisions")
        .select("*", { count: "exact", head: true })
        .eq("centro_code", newProvision.centro_code);

      const provisionNumber = `PROV-${newProvision.period_year}-${String(newProvision.period_month).padStart(2, "0")}-${String((count || 0) + 1).padStart(4, "0")}`;

      const { data, error } = await supabase
        .from("provisions")
        .insert([{ ...newProvision, provision_number: provisionNumber }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provisions"] });
      toast.success("Provisión creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear provisión: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Provision> }) => {
      const { data, error } = await supabase
        .from("provisions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provisions"] });
      toast.success("Provisión actualizada");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("provisions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provisions"] });
      toast.success("Provisión eliminada");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    provisions: provisions.data || [],
    isLoading: provisions.isLoading,
    createProvision: createMutation.mutateAsync,
    updateProvision: updateMutation.mutateAsync,
    deleteProvision: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
