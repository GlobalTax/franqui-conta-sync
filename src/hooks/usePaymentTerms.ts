import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentTerm } from "@/types/advanced-accounting";

interface PaymentTermFilters {
  centroCode?: string;
  status?: PaymentTerm['status'];
  startDate?: string;
  endDate?: string;
  invoiceType?: 'issued' | 'received';
}

export const usePaymentTerms = (filters: PaymentTermFilters = {}) => {
  const queryClient = useQueryClient();

  const { data: terms, isLoading } = useQuery({
    queryKey: ["payment-terms", filters],
    queryFn: async () => {
      let query = supabase
        .from("payment_terms")
        .select("*")
        .order("due_date", { ascending: true });

      if (filters.centroCode) {
        query = query.eq("centro_code", filters.centroCode);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.startDate) {
        query = query.gte("due_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("due_date", filters.endDate);
      }
      if (filters.invoiceType) {
        query = query.eq("invoice_type", filters.invoiceType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentTerm[];
    },
  });

  const createTerm = useMutation({
    mutationFn: async (term: Omit<PaymentTerm, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("payment_terms")
        .insert(term)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
      toast.success("Vencimiento creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear vencimiento");
      console.error(error);
    },
  });

  const updateTerm = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentTerm> & { id: string }) => {
      const { data, error } = await supabase
        .from("payment_terms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
      toast.success("Vencimiento actualizado");
    },
    onError: (error) => {
      toast.error("Error al actualizar vencimiento");
      console.error(error);
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ id, amount, date, bankAccountId }: { 
      id: string; 
      amount: number; 
      date: string; 
      bankAccountId?: string;
    }) => {
      const { data, error } = await supabase
        .from("payment_terms")
        .update({
          paid_amount: amount,
          paid_date: date,
          status: "paid",
          bank_account_id: bankAccountId,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
      toast.success("Vencimiento marcado como pagado");
    },
    onError: (error) => {
      toast.error("Error al marcar como pagado");
      console.error(error);
    },
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_terms")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
      toast.success("Vencimiento eliminado");
    },
    onError: (error) => {
      toast.error("Error al eliminar vencimiento");
      console.error(error);
    },
  });

  return {
    terms: terms || [],
    isLoading,
    createTerm: createTerm.mutate,
    updateTerm: updateTerm.mutate,
    markAsPaid: markAsPaid.mutate,
    deleteTerm: deleteTerm.mutate,
  };
};

export const usePaymentTermsAnalysis = (centroCode: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ["payment-terms-analysis", centroCode, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_payment_terms_analysis", {
        p_centro_code: centroCode,
        p_date_from: startDate,
        p_date_to: endDate,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
};
