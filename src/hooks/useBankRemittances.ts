import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BankRemittance } from "@/types/advanced-accounting";

interface RemittanceFilters {
  centroCode?: string;
  status?: BankRemittance['status'];
  remittanceType?: BankRemittance['remittance_type'];
  startDate?: string;
  endDate?: string;
}

export const useBankRemittances = (filters: RemittanceFilters = {}) => {
  const queryClient = useQueryClient();

  const { data: remittances, isLoading } = useQuery({
    queryKey: ["bank-remittances", filters],
    queryFn: async () => {
      let query = supabase
        .from("bank_remittances")
        .select("*, bank_accounts(account_name, iban)")
        .order("remittance_date", { ascending: false });

      if (filters.centroCode) {
        query = query.eq("centro_code", filters.centroCode);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.remittanceType) {
        query = query.eq("remittance_type", filters.remittanceType);
      }
      if (filters.startDate) {
        query = query.gte("remittance_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("remittance_date", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (BankRemittance & { bank_accounts: { account_name: string; iban: string } })[];
    },
  });

  const createRemittance = useMutation({
    mutationFn: async (remittance: Omit<BankRemittance, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("bank_remittances")
        .insert(remittance)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-remittances"] });
      toast.success("Remesa creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear remesa");
      console.error(error);
    },
  });

  const updateRemittance = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankRemittance> & { id: string }) => {
      const { data, error } = await supabase
        .from("bank_remittances")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-remittances"] });
      toast.success("Remesa actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar remesa");
      console.error(error);
    },
  });

  const deleteRemittance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_remittances")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-remittances"] });
      toast.success("Remesa eliminada");
    },
    onError: (error) => {
      toast.error("Error al eliminar remesa");
      console.error(error);
    },
  });

  return {
    remittances: remittances || [],
    isLoading,
    createRemittance: createRemittance.mutate,
    updateRemittance: updateRemittance.mutate,
    deleteRemittance: deleteRemittance.mutate,
  };
};

export const useRemittanceTerms = (remittanceId?: string) => {
  return useQuery({
    queryKey: ["remittance-terms", remittanceId],
    queryFn: async () => {
      if (!remittanceId) return [];
      
      const { data, error } = await supabase
        .from("payment_terms")
        .select("*")
        .eq("remittance_id", remittanceId)
        .order("due_date");

      if (error) throw error;
      return data;
    },
    enabled: !!remittanceId,
  });
};
