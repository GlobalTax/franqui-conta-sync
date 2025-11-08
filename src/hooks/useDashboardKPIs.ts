import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export const useDashboardKPIs = () => {
  const { currentMembership } = useOrganization();

  return useQuery({
    queryKey: ["dashboard-kpis", currentMembership?.restaurant?.id],
    queryFn: async () => {
      if (!currentMembership?.restaurant?.id) {
        throw new Error("No restaurant selected");
      }

      const centroCode = currentMembership.restaurant.id;

      // Facturas recibidas pendientes
      const { count: invoicesReceivedPending } = await supabase
        .from("invoices_received")
        .select("*", { count: "exact", head: true })
        .eq("centro_code", centroCode)
        .eq("status", "pending");

      // Facturas emitidas pendientes
      const { count: invoicesIssuedPending } = await supabase
        .from("invoices_issued")
        .select("*", { count: "exact", head: true })
        .eq("centro_code", centroCode)
        .in("status", ["draft", "sent"]);

      // Movimientos bancarios sin conciliar
      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("centro_code", centroCode)
        .eq("active", true);

      const accountIds = bankAccounts?.map((a) => a.id) || [];
      
      let unreconciledCount = 0;
      let totalTransactions = 0;

      if (accountIds.length > 0) {
        const { count: unreconciled } = await supabase
          .from("bank_transactions")
          .select("*", { count: "exact", head: true })
          .in("bank_account_id", accountIds)
          .eq("status", "pending");

        const { count: total } = await supabase
          .from("bank_transactions")
          .select("*", { count: "exact", head: true })
          .in("bank_account_id", accountIds);

        unreconciledCount = unreconciled || 0;
        totalTransactions = total || 0;
      }

      // Tasa de conciliación
      const reconciliationRate = totalTransactions > 0
        ? ((totalTransactions - unreconciledCount) / totalTransactions) * 100
        : 0;

      // Gastos del mes actual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: expensesData } = await supabase.rpc("calculate_pnl", {
        p_centro_code: centroCode,
        p_start_date: startOfMonth.toISOString().split("T")[0],
        p_end_date: endOfMonth.toISOString().split("T")[0],
      });

      const monthlyExpenses = expensesData
        ?.filter((item: any) => item.account_type === "expense")
        .reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0) || 0;

      return {
        invoicesReceivedPending: invoicesReceivedPending || 0,
        invoicesIssuedPending: invoicesIssuedPending || 0,
        unreconciledTransactions: unreconciledCount,
        reconciliationRate: Math.round(reconciliationRate * 10) / 10,
        monthlyExpenses,
      };
    },
    enabled: !!currentMembership?.restaurant?.id,
  });
};
