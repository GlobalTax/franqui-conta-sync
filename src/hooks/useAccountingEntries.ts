import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountingEntry, AccountingEntryWithTransactions, NewAccountingEntryFormData } from "@/types/accounting-entries";
import { toast } from "sonner";
import { EntryValidator } from "@/domain/accounting/services/EntryValidator";
import { EntryCalculator } from "@/domain/accounting/services/EntryCalculator";
import { Transaction } from "@/domain/accounting/types";

export function useAccountingEntries(centroCode?: string, filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: ["accounting-entries", centroCode, filters],
    queryFn: async () => {
      let query = supabase
        .from("accounting_entries")
        .select(`
          *,
          accounting_transactions(*)
        `)
        .order("entry_date", { ascending: false })
        .order("entry_number", { ascending: false });

      if (centroCode) {
        query = query.eq("centro_code", centroCode);
      }

      if (filters?.startDate) {
        query = query.gte("entry_date", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("entry_date", filters.endDate);
      }

      if (filters?.status && filters.status !== 'all' && (filters.status === 'draft' || filters.status === 'posted' || filters.status === 'closed')) {
        query = query.eq("status", filters.status);
      }

      if (filters?.searchTerm) {
        query = query.or(`description.ilike.%${filters.searchTerm}%,entry_number.eq.${parseInt(filters.searchTerm) || 0}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AccountingEntryWithTransactions[];
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

      // Get next entry number
      const { data: lastEntry } = await supabase
        .from("accounting_entries")
        .select("entry_number")
        .eq("fiscal_year_id", fiscalYear?.id)
        .order("entry_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextEntryNumber = (lastEntry?.entry_number || 0) + 1;

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
      const totalDebit = totals.debit;
      const totalCredit = totals.credit;

      // Create entry
      const { data: entry, error: entryError } = await supabase
        .from("accounting_entries")
        .insert({
          entry_number: nextEntryNumber,
          entry_date: formData.entry_date,
          description: formData.description,
          centro_code: centroCode,
          fiscal_year_id: fiscalYear?.id,
          created_by: user.user.id,
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create transactions for database
      const dbTransactions = formData.transactions.map((t, index) => ({
        entry_id: entry.id,
        account_code: t.account_code,
        movement_type: t.movement_type,
        amount: t.amount,
        description: t.description,
        line_number: index + 1,
      }));

      const { error: transError } = await supabase
        .from("accounting_transactions")
        .insert(dbTransactions);

      if (transError) throw transError;

      return entry;
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
