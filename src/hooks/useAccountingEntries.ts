import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountingEntry, AccountingEntryWithTransactions, NewAccountingEntryFormData } from "@/types/accounting-entries";
import { toast } from "sonner";

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

      // Validate balance
      const totalDebit = formData.transactions
        .filter(t => t.movement_type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalCredit = formData.transactions
        .filter(t => t.movement_type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("El asiento no está cuadrado. Debe = Haber");
      }

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

      // Create transactions
      const transactions = formData.transactions.map((t, index) => ({
        entry_id: entry.id,
        account_code: t.account_code,
        movement_type: t.movement_type,
        amount: t.amount,
        description: t.description,
        line_number: index + 1,
      }));

      const { error: transError } = await supabase
        .from("accounting_transactions")
        .insert(transactions);

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
