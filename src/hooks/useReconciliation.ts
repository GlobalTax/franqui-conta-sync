import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReconciliationMatch {
  id: string;
  transaction_id: string;
  match_type: "invoice" | "entry" | "manual";
  match_id: string;
  confidence_score?: number;
  matching_rules?: string[];
  status: "suggested" | "approved" | "rejected";
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export const useReconciliation = (centroCode?: string) => {
  const queryClient = useQueryClient();

  const { data: pendingMatches, isLoading: loadingPending } = useQuery({
    queryKey: ["reconciliation-pending", centroCode],
    queryFn: async () => {
      let query = supabase
        .from("reconciliation_matches")
        .select(`
          *,
          bank_transactions!inner(
            id,
            description,
            amount,
            transaction_date,
            bank_accounts!inner(
              centro_code,
              account_name
            )
          )
        `)
        .eq("status", "suggested")
        .order("created_at", { ascending: false });

      if (centroCode) {
        query = query.eq("bank_transactions.bank_accounts.centro_code", centroCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (ReconciliationMatch & { bank_transactions: any })[];
    },
  });

  const { data: approvedMatches, isLoading: loadingApproved } = useQuery({
    queryKey: ["reconciliation-approved", centroCode],
    queryFn: async () => {
      let query = supabase
        .from("reconciliation_matches")
        .select(`
          *,
          bank_transactions!inner(
            id,
            description,
            amount,
            transaction_date,
            bank_accounts!inner(
              centro_code,
              account_name
            )
          )
        `)
        .eq("status", "approved")
        .order("approved_at", { ascending: false });

      if (centroCode) {
        query = query.eq("bank_transactions.bank_accounts.centro_code", centroCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (ReconciliationMatch & { bank_transactions: any })[];
    },
  });

  const approveMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      const { data, error } = await supabase
        .from("reconciliation_matches")
        .update({
          status: "approved",
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", matchId)
        .select()
        .single();

      if (error) throw error;

      // Update transaction status
      const match = data as ReconciliationMatch;
      await supabase
        .from("bank_transactions")
        .update({ status: "reconciled" })
        .eq("id", match.transaction_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-approved"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success("Conciliación aprobada");
    },
    onError: (error) => {
      toast.error("Error al aprobar conciliación");
      console.error(error);
    },
  });

  const rejectMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { data, error } = await supabase
        .from("reconciliation_matches")
        .update({ status: "rejected" })
        .eq("id", matchId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
      toast.success("Conciliación rechazada");
    },
    onError: (error) => {
      toast.error("Error al rechazar conciliación");
      console.error(error);
    },
  });

  const suggestMatches = useMutation({
    mutationFn: async (accountId: string) => {
      // Get pending transactions
      const { data: transactions, error: txError } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("bank_account_id", accountId)
        .eq("status", "pending");

      if (txError) throw txError;

      // Get accounting entries from the same centro
      const { data: account } = await supabase
        .from("bank_accounts")
        .select("centro_code")
        .eq("id", accountId)
        .single();

      const { data: entries, error: entriesError } = await supabase
        .from("accounting_entries")
        .select(`
          id,
          entry_date,
          description,
          total_debit,
          total_credit
        `)
        .eq("centro_code", account?.centro_code)
        .eq("status", "posted");

      if (entriesError) throw entriesError;

      // Simple matching algorithm
      const matches: Omit<ReconciliationMatch, "id" | "created_at">[] = [];

      for (const tx of transactions || []) {
        for (const entry of entries || []) {
          const rules: string[] = [];
          let score = 0;

          // Check amount match (debit/credit)
          const entryAmount = tx.amount > 0 ? entry.total_credit : Math.abs(entry.total_debit);
          if (Math.abs(Math.abs(tx.amount) - entryAmount) < 0.01) {
            rules.push("exact_amount");
            score += 0.5;
          }

          // Check date proximity (±3 days)
          const txDate = new Date(tx.transaction_date);
          const entryDate = new Date(entry.entry_date);
          const daysDiff = Math.abs((txDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 3) {
            rules.push("date_3_days");
            score += 0.3;
          }

          // Check description similarity
          const txDesc = tx.description.toLowerCase();
          const entryDesc = entry.description.toLowerCase();
          if (txDesc.includes(entryDesc.split(" ")[0]) || entryDesc.includes(txDesc.split(" ")[0])) {
            rules.push("text_similarity");
            score += 0.2;
          }

          // If confidence > 50%, suggest match
          if (score >= 0.5) {
            matches.push({
              transaction_id: tx.id,
              match_type: "entry",
              match_id: entry.id,
              confidence_score: Math.min(score, 1),
              matching_rules: rules,
              status: "suggested",
            });
          }
        }
      }

      // Insert matches
      if (matches.length > 0) {
        const { data, error } = await supabase
          .from("reconciliation_matches")
          .insert(matches)
          .select();

        if (error) throw error;
        return data;
      }

      return [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-pending"] });
      toast.success(`${data.length} coincidencias encontradas`);
    },
    onError: (error) => {
      toast.error("Error al buscar coincidencias");
      console.error(error);
    },
  });

  return {
    pendingMatches: pendingMatches || [],
    approvedMatches: approvedMatches || [],
    isLoading: loadingPending || loadingApproved,
    approveMatch: approveMatch.mutate,
    rejectMatch: rejectMatch.mutate,
    suggestMatches: suggestMatches.mutate,
  };
};
