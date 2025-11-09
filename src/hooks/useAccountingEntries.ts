import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountingEntry, AccountingEntryWithTransactions, NewAccountingEntryFormData } from "@/types/accounting-entries";
import { toast } from "sonner";
import { EntryValidator } from "@/domain/accounting/services/EntryValidator";
import { EntryCalculator } from "@/domain/accounting/services/EntryCalculator";
import { Transaction } from "@/domain/accounting/types";
import { getJournalEntries, createJournalEntry, getNextEntryNumber } from "@/infrastructure/persistence/supabase/queries/EntryQueries";

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

  return useMutation({
    mutationFn: async ({ centroCode, formData }: { centroCode: string; formData: NewAccountingEntryFormData }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No autenticado");

      // Get current fiscal year
      const { data: fiscalYear } = await supabase
        .from("fiscal_years")
        .select("id")
        .eq("centro_code", centroCode)
        .eq("status", "open")
        .single();

      if (!fiscalYear) {
        throw new Error("No hay ejercicio fiscal abierto para este centro");
      }

      // Convert to domain types for validation
      const domainTransactions: Transaction[] = formData.transactions.map(t => ({
        accountCode: t.account_code,
        movementType: t.movement_type,
        amount: t.amount,
        description: t.description,
      }));

      // Validate using domain services
      const validation = EntryValidator.validateEntry({
        entryDate: formData.entry_date,
        description: formData.description,
        centroCode: centroCode,
        totalDebit: 0, // Will be calculated
        totalCredit: 0, // Will be calculated
        transactions: domainTransactions,
      });

      if (!validation.valid) {
        throw new Error(validation.details || validation.error);
      }

      // Calculate totals using domain service
      const totals = EntryCalculator.calculateTotals(domainTransactions);

      // Get next entry number using new query layer
      const nextEntryNumber = await getNextEntryNumber(fiscalYear.id);

      // Create entry using new query layer
      const createdEntry = await createJournalEntry({
        entryDate: formData.entry_date,
        description: formData.description,
        centroCode: centroCode,
        fiscalYearId: fiscalYear.id,
        status: 'draft',
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        transactions: domainTransactions,
        createdBy: user.user.id,
      }, nextEntryNumber);

      // Mapear de vuelta al formato esperado por UI
      return {
        id: createdEntry.id,
        entry_number: createdEntry.entryNumber,
        entry_date: createdEntry.entryDate,
        description: createdEntry.description,
        centro_code: createdEntry.centroCode,
        fiscal_year_id: createdEntry.fiscalYearId || null,
        status: createdEntry.status,
        total_debit: createdEntry.totalDebit,
        total_credit: createdEntry.totalCredit,
        created_by: createdEntry.createdBy || null,
        created_at: createdEntry.createdAt || '',
        updated_at: createdEntry.updatedAt || '',
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
