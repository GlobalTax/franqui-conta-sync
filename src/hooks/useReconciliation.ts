import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReconciliationMatch {
  id: string;
  bank_transaction_id: string;
  accounting_entry_id?: string;
  match_type: "manual" | "automatic" | "suggested";
  status: "pending" | "approved" | "rejected";
  confidence_score?: number;
  matched_by?: string;
  matched_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
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
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (centroCode) {
        query = query.eq("bank_transactions.bank_accounts.centro_code", centroCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any;
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
      return data as any;
    },
  });

  const approveMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      let { data, error } = await supabase
        .from("reconciliation_matches")
        .update({
          status: "approved",
          matched_by: userId,
          matched_at: new Date().toISOString(),
        })
        .eq("id", matchId)
        .select()
        .single();

      // Fallback: si matched_at/matched_by no existen, usar approved_at/approved_by
      if (error && (error as any).code === '42703') {
        const fallbackResult = await supabase
          .from("reconciliation_matches")
          .update({
            status: "approved",
            approved_by: userId,
            approved_at: new Date().toISOString(),
          })
          .eq("id", matchId)
          .select()
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      // Update transaction status usando bank_transaction_id o transaction_id
      const match = data as any;
      const txId = match.bank_transaction_id || match.transaction_id;
      await supabase
        .from("bank_transactions")
        .update({ status: "reconciled" })
        .eq("id", txId);

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
    mutationFn: async (params: { centroCode: string; startDate: string; endDate: string }) => {
      // Call the database function to find potential matches
      const { data, error } = await supabase.rpc("suggest_reconciliation_matches" as any, {
        p_centro_code: params.centroCode,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
      });

      if (error) throw error;

      // Insert suggested matches
      if (data && data.length > 0) {
        const matches = data.map((match: any) => ({
          bank_transaction_id: match.bank_transaction_id,
          accounting_entry_id: match.accounting_entry_id,
          match_type: "suggested",
          status: "pending",
          confidence_score: match.confidence_score,
          notes: match.match_reason,
        }));

        const { error: insertError } = await supabase
          .from("reconciliation_matches")
          .insert(matches as any);

        if (insertError) throw insertError;
      }

      return data || [];
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
