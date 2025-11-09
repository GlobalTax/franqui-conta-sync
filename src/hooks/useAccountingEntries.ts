import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountingEntry, AccountingEntryWithTransactions, NewAccountingEntryFormData } from "@/types/accounting-entries";
import { toast } from "sonner";
import { getJournalEntries } from "@/infrastructure/persistence/supabase/queries/EntryQueries";
import { CreateAccountingEntryUseCase } from "@/domain/accounting/use-cases/CreateAccountingEntry";

export function useAccountingEntries(centroCode?: string, filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: ["accounting-entries", centroCode, filters],
    queryFn: async () => {
      // Usar nueva capa de queries centralizada
      const statusFilter = filters?.status && filters.status !== 'all' 
        ? (filters.status as 'draft' | 'posted' | 'closed')
        : undefined;

      const result = await getJournalEntries({
        centroCode,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: statusFilter,
        searchTerm: filters?.searchTerm,
      });

      // Mapear de dominio a formato esperado por UI (temporal hasta migrar tipos)
      return result.entries.map(entry => ({
        id: entry.id,
        entry_number: entry.entryNumber,
        entry_date: entry.entryDate,
        description: entry.description,
        centro_code: entry.centroCode,
        fiscal_year_id: entry.fiscalYearId || null,
        status: entry.status,
        total_debit: entry.totalDebit,
        total_credit: entry.totalCredit,
        created_by: entry.createdBy || null,
        created_at: entry.createdAt || '',
        updated_at: entry.updatedAt || '',
        accounting_transactions: entry.transactions.map(t => ({
          id: t.id || '',
          entry_id: entry.id,
          account_code: t.accountCode,
          movement_type: t.movementType,
          amount: t.amount,
          description: t.description || null,
          document_ref: null,
          line_number: t.lineNumber || 0,
          created_at: entry.createdAt || '',
        })),
      })) as AccountingEntryWithTransactions[];
    },
  });
}

export function useCreateAccountingEntry() {
  const queryClient = useQueryClient();
  const createEntryUseCase = new CreateAccountingEntryUseCase();

  return useMutation({
    mutationFn: async ({ centroCode, formData }: { centroCode: string; formData: NewAccountingEntryFormData }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No autenticado");

      const result = await createEntryUseCase.execute({
        centroCode,
        entryDate: formData.entry_date,
        description: formData.description,
        transactions: formData.transactions.map(t => ({
          accountCode: t.account_code,
          movementType: t.movement_type,
          amount: t.amount,
          description: t.description,
        })),
        createdBy: user.user.id,
      });

      // Mapear de vuelta al formato esperado por UI
      return {
        id: result.entry.id,
        entry_number: result.entry.entryNumber,
        entry_date: result.entry.entryDate,
        description: result.entry.description,
        centro_code: result.entry.centroCode,
        fiscal_year_id: result.entry.fiscalYearId || null,
        status: result.entry.status,
        total_debit: result.entry.totalDebit,
        total_credit: result.entry.totalCredit,
        created_by: result.entry.createdBy || null,
        created_at: result.entry.createdAt || '',
        updated_at: result.entry.updatedAt || '',
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      toast.success("Asiento contable creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear asiento contable");
    },
  });
}
