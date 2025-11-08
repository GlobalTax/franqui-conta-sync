import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

export const useBankBalance = (accountId: string) => {
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["bank-balance", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("id", accountId)
        .single();

      if (error) throw error;
      return data?.current_balance || 0;
    },
    enabled: !!accountId,
  });

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ["bank-balance-weekly", accountId],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      const { data, error } = await supabase
        .from("bank_transactions")
        .select("transaction_date, balance")
        .eq("bank_account_id", accountId)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"))
        .order("transaction_date", { ascending: true });

      if (error) throw error;

      // If no balance in transactions, calculate running balance
      let runningBalance = balance || 0;
      return (
        data?.map((t) => ({
          date: t.transaction_date,
          balance: t.balance || runningBalance,
        })) || []
      );
    },
    enabled: !!accountId && !!balance,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["bank-reconciliation-stats", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("status")
        .eq("bank_account_id", accountId);

      if (error) throw error;

      const stats = {
        pending: data?.filter((t) => t.status === "pending").length || 0,
        reconciled: data?.filter((t) => t.status === "reconciled").length || 0,
        errors: data?.filter((t) => t.status === "ignored").length || 0,
      };

      return stats;
    },
    enabled: !!accountId,
  });

  return {
    balance,
    weeklyData,
    stats,
    isLoading: balanceLoading || weeklyLoading || statsLoading,
  };
};
