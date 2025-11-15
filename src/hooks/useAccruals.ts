// ============================================================================
// HOOK: useAccruals - Gestión de periodificaciones
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useView } from "@/contexts/ViewContext";

export interface Accrual {
  id: string;
  centro_code: string;
  accrual_type: 'income' | 'expense';
  account_code: string;
  counterpart_account: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  description: string;
  invoice_id?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AccrualEntry {
  id: string;
  accrual_id: string;
  period_date: string;
  period_year: number;
  period_month: number;
  amount: number;
  accounting_entry_id?: string;
  status: 'pending' | 'posted';
  created_at: string;
}

export const useAccruals = () => {
  const { selectedView } = useView();
  const queryClient = useQueryClient();

  const accruals = useQuery({
    queryKey: ["accruals", selectedView?.id],
    queryFn: async () => {
      if (!selectedView) return [];

      const { data, error } = await supabase
        .from("accruals")
        .select("*")
        .eq("centro_code", selectedView.code || selectedView.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Accrual[];
    },
    enabled: !!selectedView,
  });

  const createMutation = useMutation({
    mutationFn: async (newAccrual: Omit<Accrual, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("accruals")
        .insert(newAccrual)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accruals"] });
      toast.success("Periodificación creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear periodificación: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Accrual> }) => {
      const { data, error } = await supabase
        .from("accruals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accruals"] });
      toast.success("Periodificación actualizada");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accruals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accruals"] });
      toast.success("Periodificación eliminada");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  return {
    accruals: accruals.data || [],
    isLoading: accruals.isLoading,
    createAccrual: createMutation.mutateAsync,
    updateAccrual: updateMutation.mutateAsync,
    deleteAccrual: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook para obtener los asientos periódicos de una periodificación
export const useAccrualEntries = (accrualId: string | null) => {
  return useQuery({
    queryKey: ["accrual-entries", accrualId],
    queryFn: async () => {
      if (!accrualId) return [];

      const { data, error } = await supabase
        .from("accrual_entries")
        .select("*")
        .eq("accrual_id", accrualId)
        .order("period_date", { ascending: true });

      if (error) throw error;
      return data as AccrualEntry[];
    },
    enabled: !!accrualId,
  });
};
