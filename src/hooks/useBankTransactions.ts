import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  value_date?: string;
  description: string;
  reference?: string;
  amount: number;
  balance?: number;
  status: "pending" | "reconciled" | "ignored";
  matched_entry_id?: string;
  matched_invoice_id?: string;
  reconciliation_id?: string;
  import_batch_id?: string;
  created_at: string;
}

interface TransactionFilters {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  centroCode?: string;
}

export const useBankTransactions = (filters: TransactionFilters = {}) => {
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["bank-transactions", filters],
    queryFn: async () => {
      let query = supabase
        .from("bank_transactions")
        .select(`
          *,
          bank_accounts!inner(
            id,
            account_name,
            iban,
            centro_code
          )
        `)
        .order("transaction_date", { ascending: false });

      if (filters.accountId) {
        query = query.eq("bank_account_id", filters.accountId);
      }

      if (filters.startDate) {
        query = query.gte("transaction_date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("transaction_date", filters.endDate);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.centroCode) {
        query = query.eq("bank_accounts.centro_code", filters.centroCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (BankTransaction & { bank_accounts: any })[];
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<BankTransaction, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .insert(transaction)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success("Transacción creada");
    },
    onError: (error) => {
      toast.error("Error al crear transacción");
      console.error(error);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success("Transacción actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar transacción");
      console.error(error);
    },
  });

  const importTransactions = useMutation({
    mutationFn: async (transactions: Omit<BankTransaction, "id" | "created_at">[]) => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .insert(transactions)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success(`${data.length} transacciones importadas`);
    },
    onError: (error) => {
      toast.error("Error al importar transacciones");
      console.error(error);
    },
  });

  return {
    transactions: transactions || [],
    isLoading,
    createTransaction: createTransaction.mutate,
    updateTransaction: updateTransaction.mutate,
    importTransactions: importTransactions.mutate,
  };
};
