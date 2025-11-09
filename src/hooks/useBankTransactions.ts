import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  getBankTransactions, 
  createBankTransaction, 
  updateBankTransaction,
  importBankTransactions 
} from "@/infrastructure/persistence/supabase/queries/BankQueries";
import type { BankTransactionFilters } from "@/domain/banking/types";

// Tipo exportado para retrocompatibilidad (snake_case)
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
      const queryFilters: BankTransactionFilters = {
        accountId: filters.accountId,
        centroCode: filters.centroCode,
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status as any,
      };

      const domainTransactions = await getBankTransactions(queryFilters);

      // Convertir de camelCase (dominio) a snake_case (API legacy)
      return domainTransactions.map(trans => ({
        id: trans.id,
        bank_account_id: trans.bankAccountId,
        transaction_date: trans.transactionDate,
        value_date: trans.valueDate,
        description: trans.description,
        reference: trans.reference,
        amount: trans.amount,
        balance: trans.balance,
        status: trans.status,
        matched_entry_id: trans.matchedEntryId,
        matched_invoice_id: trans.matchedInvoiceId,
        reconciliation_id: trans.reconciliationId,
        import_batch_id: trans.importBatchId,
        created_at: trans.createdAt,
      })) as (BankTransaction & { bank_accounts?: any })[];
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<BankTransaction, "id" | "created_at">) => {
      const domainTrans = {
        bankAccountId: transaction.bank_account_id,
        transactionDate: transaction.transaction_date,
        valueDate: transaction.value_date || null,
        description: transaction.description,
        reference: transaction.reference || null,
        amount: transaction.amount,
        balance: transaction.balance || null,
        status: transaction.status,
        matchedEntryId: transaction.matched_entry_id || null,
        matchedInvoiceId: transaction.matched_invoice_id || null,
        reconciliationId: transaction.reconciliation_id || null,
        importBatchId: transaction.import_batch_id || null,
      };
      const result = await createBankTransaction(domainTrans as any);
      return result;
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
      const domainUpdates = {
        bankAccountId: updates.bank_account_id,
        transactionDate: updates.transaction_date,
        valueDate: updates.value_date,
        description: updates.description,
        reference: updates.reference,
        amount: updates.amount,
        balance: updates.balance,
        status: updates.status,
        matchedEntryId: updates.matched_entry_id,
        matchedInvoiceId: updates.matched_invoice_id,
        reconciliationId: updates.reconciliation_id,
        importBatchId: updates.import_batch_id,
      };
      const result = await updateBankTransaction(id, domainUpdates as any);
      return result;
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
      const domainTransactions = transactions.map(t => ({
        bankAccountId: t.bank_account_id,
        transactionDate: t.transaction_date,
        valueDate: t.value_date || null,
        description: t.description,
        reference: t.reference || null,
        amount: t.amount,
        balance: t.balance || null,
        status: t.status,
        matchedEntryId: t.matched_entry_id || null,
        matchedInvoiceId: t.matched_invoice_id || null,
        reconciliationId: t.reconciliation_id || null,
        importBatchId: t.import_batch_id || null,
      }));
      const results = await importBankTransactions(domainTransactions as any);
      return results;
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
