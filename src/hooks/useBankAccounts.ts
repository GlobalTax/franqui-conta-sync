import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BankAccount {
  id: string;
  centro_code: string;
  account_name: string;
  iban: string;
  swift?: string;
  currency: string;
  current_balance: number;
  account_code?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBankAccounts = (centroCode?: string) => {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["bank-accounts", centroCode],
    queryFn: async () => {
      let query = supabase
        .from("bank_accounts")
        .select("*")
        .eq("active", true)
        .order("account_name");

      if (centroCode) {
        query = query.eq("centro_code", centroCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BankAccount[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: Omit<BankAccount, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert(account)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta bancaria creada");
    },
    onError: (error) => {
      toast.error("Error al crear cuenta bancaria");
      console.error(error);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta bancaria actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar cuenta bancaria");
      console.error(error);
    },
  });

  return {
    accounts: accounts || [],
    isLoading,
    createAccount: createAccount.mutate,
    updateAccount: updateAccount.mutate,
  };
};
