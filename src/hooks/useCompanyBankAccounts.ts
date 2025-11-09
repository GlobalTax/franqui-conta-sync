import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CompanyBankAccount {
  id: string;
  company_id: string;
  account_name: string;
  iban: string;
  swift?: string;
  bank_name?: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompanyBankAccounts(companyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ["company-bank-accounts", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("company_bank_accounts" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CompanyBankAccount[];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (accountData: Omit<CompanyBankAccount, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("company_bank_accounts" as any)
        .insert(accountData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-bank-accounts", companyId] });
      toast({
        title: "Cuenta bancaria creada",
        description: "La cuenta bancaria se ha añadido correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cuenta",
        description: error.message || "No se pudo crear la cuenta bancaria",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyBankAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from("company_bank_accounts" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-bank-accounts", companyId] });
      toast({
        title: "Cuenta actualizada",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("company_bank_accounts" as any)
        .delete()
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-bank-accounts", companyId] });
      toast({
        title: "Cuenta eliminada",
        description: "La cuenta bancaria se ha eliminado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la cuenta bancaria",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (accountId: string) => {
      // First, unset all defaults for this company
      await supabase
        .from("company_bank_accounts" as any)
        .update({ is_default: false })
        .eq("company_id", companyId);

      // Then set the selected one as default
      const { error } = await supabase
        .from("company_bank_accounts" as any)
        .update({ is_default: true })
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-bank-accounts", companyId] });
      toast({
        title: "Cuenta predeterminada establecida",
        description: "Esta cuenta se usará por defecto para pagos y cobros",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo establecer como predeterminada",
        variant: "destructive",
      });
    },
  });

  return {
    accounts: accounts || [],
    isLoading,
    error,
    createAccount: createMutation.mutate,
    updateAccount: updateMutation.mutate,
    deleteAccount: deleteMutation.mutate,
    setDefaultAccount: setDefaultMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
