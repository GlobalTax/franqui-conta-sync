// ============================================================================
// HOOK: useInventoryClosures - Gestión de asientos de existencias mensuales
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useView } from "@/contexts/ViewContext";

export interface InventoryClosure {
  id: string;
  centro_code: string;
  closure_month: number;
  closure_year: number;
  entry_type: 'global' | 'detailed';
  total_amount?: number;
  accounting_entry_id?: string;
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  posted_at?: string;
  posted_by?: string;
  lines?: InventoryClosureLine[];
}

export interface InventoryClosureLine {
  id: string;
  closure_id: string;
  line_number: number;
  category: 'food' | 'paper' | 'beverages' | 'other';
  description: string;
  account_code?: string;
  variation_account?: string;
  initial_stock: number;
  final_stock: number;
  variation: number;
  created_at: string;
}

export const useInventoryClosures = () => {
  const { selectedView } = useView();
  const queryClient = useQueryClient();

  const closures = useQuery({
    queryKey: ["inventory-closures", selectedView?.code || selectedView?.id],
    queryFn: async () => {
      if (!selectedView) return [];

      const { data, error } = await supabase
        .from("inventory_closures")
        .select(`
          *,
          lines:inventory_closure_lines(*)
        `)
        .eq("centro_code", selectedView.code || selectedView.id)
        .order("closure_year", { ascending: false })
        .order("closure_month", { ascending: false });

      if (error) throw error;
      return data as InventoryClosure[];
    },
    enabled: !!selectedView,
  });

  const createMutation = useMutation({
    mutationFn: async (newClosure: Omit<InventoryClosure, "id" | "created_at" | "updated_at">) => {
      const { lines, ...closureData } = newClosure;

      // Crear el cierre principal
      const { data: closure, error: closureError } = await supabase
        .from("inventory_closures")
        .insert(closureData)
        .select()
        .single();

      if (closureError) throw closureError;

      // Si hay líneas de detalle, insertarlas
      if (lines && lines.length > 0) {
        const linesData = lines.map((line, index) => ({
          closure_id: closure.id,
          line_number: index + 1,
          category: line.category,
          description: line.description,
          account_code: line.account_code,
          variation_account: line.variation_account,
          initial_stock: line.initial_stock,
          final_stock: line.final_stock,
        }));

        const { error: linesError } = await supabase
          .from("inventory_closure_lines")
          .insert(linesData);

        if (linesError) throw linesError;
      }

      return closure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-closures"] });
      toast.success("Cierre de existencias creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear cierre: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryClosure> }) => {
      const { lines, ...closureUpdates } = updates;

      // Actualizar el cierre principal
      const { data, error } = await supabase
        .from("inventory_closures")
        .update(closureUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Si hay líneas, eliminar las existentes y crear las nuevas
      if (lines !== undefined) {
        // Eliminar líneas existentes
        await supabase
          .from("inventory_closure_lines")
          .delete()
          .eq("closure_id", id);

        // Insertar nuevas líneas si existen
        if (lines.length > 0) {
          const linesData = lines.map((line, index) => ({
            closure_id: id,
            line_number: index + 1,
            category: line.category,
            description: line.description,
            account_code: line.account_code,
            variation_account: line.variation_account,
            initial_stock: line.initial_stock,
            final_stock: line.final_stock,
          }));

          const { error: linesError } = await supabase
            .from("inventory_closure_lines")
            .insert(linesData);

          if (linesError) throw linesError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-closures"] });
      toast.success("Cierre actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventory_closures")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-closures"] });
      toast.success("Cierre eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      // Llamar a función edge para generar el asiento contable
      const { data, error } = await supabase.functions.invoke('post-inventory-closure', {
        body: { closureId: id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-closures"] });
      toast.success("Asiento de existencias contabilizado");
    },
    onError: (error: Error) => {
      toast.error(`Error al contabilizar: ${error.message}`);
    },
  });

  return {
    closures: closures.data || [],
    isLoading: closures.isLoading,
    createClosure: createMutation.mutateAsync,
    updateClosure: updateMutation.mutateAsync,
    deleteClosure: deleteMutation.mutateAsync,
    postClosure: postMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPosting: postMutation.isPending,
  };
};
