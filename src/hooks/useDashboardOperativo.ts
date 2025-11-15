import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";

export interface OperationalKPIs {
  // Ventas y Operaciones
  dailySales: number;
  monthlySales: number;
  salesVsLastYear: number;
  
  // Labor
  laborHours: number;
  laborCost: number;
  laborPercentage: number; // % sobre ventas
  cplh: number; // Cost Per Labor Hour
  
  // Food Cost
  foodCost: number;
  foodCostPercentage: number;
  
  // Operational
  dailyClosures: {
    pending: number;
    validated: number;
    posted: number;
  };
  
  // Facturas
  invoicesPending: number;
  invoicesApprovalNeeded: number;
  invoicesOverdue: number;
  
  // Tesorería
  bankBalance: number;
  unreconciledTransactions: number;
  reconciliationRate: number;
  
  // Cash management
  cashDifferences: number;
  arqueoAlerts: number;
  
  // Comparativas (para controller)
  ranking?: {
    centroCode: string;
    centroName: string;
    sales: number;
    laborPercentage: number;
    foodCostPercentage: number;
    ebitda: number;
  }[];
}

export const useDashboardOperativo = (viewSelection: ViewSelection | null) => {
  return useQuery({
    queryKey: ["dashboard-operativo", viewSelection],
    queryFn: async () => {
      if (!viewSelection) {
        throw new Error("No view selected");
      }

      let centroCodes: string[] = [];
      let companyId: string | null = null;

      if (viewSelection.type === 'company') {
        companyId = viewSelection.id;
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo, nombre")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        centroCodes = centres?.map(c => c.codigo) || [];
      } else {
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", viewSelection.id)
          .single();

        if (centre) centroCodes = [centre.codigo];
      }

      if (centroCodes.length === 0) {
        return getEmptyKPIs();
      }

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      // Ventas del día (desde cierres diarios)
      const { data: todayClosures } = await supabase
        .from("daily_closures")
        .select("total_sales")
        .in("centro_code", centroCodes)
        .eq("closure_date", today);

      const dailySales = todayClosures?.reduce((sum, c) => sum + Number(c.total_sales), 0) || 0;

      // Ventas del mes
      const { data: monthClosures } = await supabase
        .from("daily_closures")
        .select("total_sales")
        .in("centro_code", centroCodes)
        .gte("closure_date", startOfMonth)
        .lte("closure_date", endOfMonth);

      const monthlySales = monthClosures?.reduce((sum, c) => sum + Number(c.total_sales), 0) || 0;

      // Cierres diarios por estado
      const { data: closuresStatus } = await supabase
        .from("daily_closures")
        .select("status")
        .in("centro_code", centroCodes)
        .gte("closure_date", startOfMonth);

      const dailyClosures = {
        pending: closuresStatus?.filter(c => c.status === 'draft').length || 0,
        validated: closuresStatus?.filter(c => c.status === 'validated').length || 0,
        posted: closuresStatus?.filter(c => c.status === 'posted').length || 0,
      };

      // Facturas pendientes
      const { count: invoicesPending } = await supabase
        .from("invoices_received")
        .select("*", { count: "exact", head: true })
        .in("centro_code", centroCodes)
        .eq("status", "pending");

      // Facturas necesitan aprobación (status draft or needs validation)
      const { count: invoicesApprovalNeeded } = await supabase
        .from("invoices_received")
        .select("*", { count: "exact", head: true })
        .in("centro_code", centroCodes)
        .in("status", ["draft", "pending"]);

      // Facturas vencidas
      const { count: invoicesOverdue } = await supabase
        .from("invoices_received")
        .select("*", { count: "exact", head: true })
        .in("centro_code", centroCodes)
        .eq("status", "approved")
        .lt("due_date", today);

      // Transacciones bancarias sin conciliar
      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("id")
        .in("centro_code", centroCodes)
        .eq("active", true);

      const accountIds = bankAccounts?.map(a => a.id) || [];
      
      let unreconciledCount = 0;
      let totalTransactions = 0;
      let totalBalance = 0;

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

        const { data: balances } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .in("id", accountIds);

        unreconciledCount = unreconciled || 0;
        totalTransactions = total || 0;
        totalBalance = balances?.reduce((sum, b) => sum + Number(b.current_balance || 0), 0) || 0;
      }

      const reconciliationRate = totalTransactions > 0
        ? ((totalTransactions - unreconciledCount) / totalTransactions) * 100
        : 0;

      // Alertas de arqueo (diferencias > 2%)
      const { data: arqueoAlerts } = await supabase
        .from("daily_closures")
        .select("expected_cash, actual_cash")
        .in("centro_code", centroCodes)
        .gte("closure_date", startOfMonth);

      const cashDifferencesCount = arqueoAlerts?.filter(c => {
        const expected = Number(c.expected_cash);
        const counted = Number(c.actual_cash || 0);
        const diff = Math.abs(expected - counted);
        return expected > 0 && (diff / expected) > 0.02;
      }).length || 0;

      // Labor cost (mock - will be real when integrated with Orquest)
      const laborCost = monthlySales * 0.28; // Estimado 28% de ventas
      const laborHours = monthlySales / 12; // Estimado ~12€/hora promedio
      const cplh = laborHours > 0 ? laborCost / laborHours : 0;

      // Food cost (desde gastos contables)
      const expensesPromises = centroCodes.map(code =>
        supabase.rpc("calculate_pnl", {
          p_centro_code: code,
          p_start_date: startOfMonth,
          p_end_date: endOfMonth,
        })
      );

      const expensesResults = await Promise.all(expensesPromises);
      
      const foodCost = expensesResults
        .flatMap(r => r.data || [])
        .filter((item: any) => item.account_code?.startsWith('60'))
        .reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0);

      const kpis: OperationalKPIs = {
        dailySales,
        monthlySales,
        salesVsLastYear: 5.2, // Mock - necesitará cálculo real
        
        laborHours,
        laborCost,
        laborPercentage: monthlySales > 0 ? (laborCost / monthlySales) * 100 : 0,
        cplh,
        
        foodCost,
        foodCostPercentage: monthlySales > 0 ? (foodCost / monthlySales) * 100 : 0,
        
        dailyClosures,
        
        invoicesPending: invoicesPending || 0,
        invoicesApprovalNeeded: invoicesApprovalNeeded || 0,
        invoicesOverdue: invoicesOverdue || 0,
        
        bankBalance: totalBalance,
        unreconciledTransactions: unreconciledCount,
        reconciliationRate: Math.round(reconciliationRate * 10) / 10,
        
        cashDifferences: cashDifferencesCount,
        arqueoAlerts: cashDifferencesCount,
      };

      // Si es vista consolidada, añadir ranking
      if (viewSelection.type === 'company') {
        kpis.ranking = await getRanking(centroCodes);
      }

      return kpis;
    },
    enabled: !!viewSelection,
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Solo cada 2 min si tiene foco
  });
};

function getEmptyKPIs(): OperationalKPIs {
  return {
    dailySales: 0,
    monthlySales: 0,
    salesVsLastYear: 0,
    laborHours: 0,
    laborCost: 0,
    laborPercentage: 0,
    cplh: 0,
    foodCost: 0,
    foodCostPercentage: 0,
    dailyClosures: { pending: 0, validated: 0, posted: 0 },
    invoicesPending: 0,
    invoicesApprovalNeeded: 0,
    invoicesOverdue: 0,
    bankBalance: 0,
    unreconciledTransactions: 0,
    reconciliationRate: 0,
    cashDifferences: 0,
    arqueoAlerts: 0,
  };
}

async function getRanking(centroCodes: string[]) {
  // Mock ranking - implementar con datos reales
  const rankings = await Promise.all(
    centroCodes.map(async (code) => {
      const { data: centre } = await supabase
        .from("centres")
        .select("nombre")
        .eq("codigo", code)
        .single();

      return {
        centroCode: code,
        centroName: centre?.nombre || code,
        sales: Math.random() * 100000,
        laborPercentage: 25 + Math.random() * 10,
        foodCostPercentage: 28 + Math.random() * 8,
        ebitda: Math.random() * 20000,
      };
    })
  );

  return rankings.sort((a, b) => b.sales - a.sales);
}
