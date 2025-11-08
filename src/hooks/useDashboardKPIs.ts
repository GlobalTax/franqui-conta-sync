import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";

export const useDashboardKPIs = (viewSelection: ViewSelection | null) => {

  return useQuery({
    queryKey: ["dashboard-kpis", viewSelection],
    queryFn: async () => {
      if (!viewSelection) {
        throw new Error("No view selected");
      }

      let centroCodes: string[] = [];

      if (viewSelection.type === 'company') {
        // Vista consolidada: obtener todos los centros
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        centroCodes = centres?.map(c => c.codigo) || [];
      } else {
        // Vista individual
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", viewSelection.id)
          .single();

        if (centre) centroCodes = [centre.codigo];
      }

      if (centroCodes.length === 0) {
        return {
          invoicesReceivedPending: 0,
          invoicesIssuedPending: 0,
          unreconciledTransactions: 0,
          reconciliationRate: 0,
          monthlyExpenses: 0,
        };
      }

      // Facturas recibidas pendientes (suma de todos los centros)
      const { count: invoicesReceivedPending } = await supabase
        .from("invoices_received")
        .select("*", { count: "exact", head: true })
        .in("centro_code", centroCodes)
        .eq("status", "pending");

      // Facturas emitidas pendientes
      const { count: invoicesIssuedPending } = await supabase
        .from("invoices_issued")
        .select("*", { count: "exact", head: true })
        .in("centro_code", centroCodes)
        .in("status", ["draft", "sent"]);

      // Movimientos bancarios sin conciliar
      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("id")
        .in("centro_code", centroCodes)
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

      // Gastos del mes (consolidar si es necesario)
      const expensesPromises = centroCodes.map(code =>
        supabase.rpc("calculate_pnl", {
          p_centro_code: code,
          p_start_date: startOfMonth.toISOString().split("T")[0],
          p_end_date: endOfMonth.toISOString().split("T")[0],
        })
      );

      const expensesResults = await Promise.all(expensesPromises);
      
      const monthlyExpenses = expensesResults
        .flatMap(r => r.data || [])
        .filter((item: any) => item.account_type === "expense")
        .reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0);

      return {
        invoicesReceivedPending: invoicesReceivedPending || 0,
        invoicesIssuedPending: invoicesIssuedPending || 0,
        unreconciledTransactions: unreconciledCount,
        reconciliationRate: Math.round(reconciliationRate * 10) / 10,
        monthlyExpenses,
      };
    },
    enabled: !!viewSelection,
  });
};
