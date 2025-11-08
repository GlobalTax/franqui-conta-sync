import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

interface CentreData {
  centroCode: string;
  centroName: string;
  sales: number;
  ebitda: number;
  foodCostPct: number;
  laborPct: number;
  cplh: number;
  iva: number;
  netMargin: number;
}

interface MonthlyEvolution {
  month: string;
  sales: number;
  foodCostPct: number;
  laborPct: number;
  otherExpensesPct: number;
}

interface RankingItem {
  centroCode: string;
  centroName: string;
  value: number;
  badge: "up" | "down" | "neutral";
}

export function useConsolidatedReports(
  viewSelection: ViewSelection | null,
  period: { start: string; end: string }
) {
  return useQuery({
    queryKey: ["consolidated-reports", viewSelection, period],
    queryFn: async () => {
      if (!viewSelection) {
        throw new Error("No view selected");
      }

      // 1. Get centro codes
      let centroCodes: { code: string; name: string }[] = [];

      if (viewSelection.type === "company") {
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo, nombre")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        centroCodes = centres?.map(c => ({ code: c.codigo, name: c.nombre })) || [];
      } else {
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo, nombre")
          .eq("id", viewSelection.id)
          .single();

        if (centre) centroCodes = [{ code: centre.codigo, name: centre.nombre }];
      }

      if (centroCodes.length === 0) {
        return {
          aggregated: { totalSales: 0, avgEBITDA: 0, avgFoodCost: 0, avgLabor: 0 },
          rankings: { byEBITDA: [], byLabor: [], byMargin: [] },
          monthlyEvolution: [],
          centreData: [],
        };
      }

      // 2. Fetch data for each centre
      const centreDataPromises = centroCodes.map(({ code, name }) => 
        fetchCentreData(code, name, period)
      );
      const centreData = await Promise.all(centreDataPromises);

      // 3. Aggregate data
      const aggregated = {
        totalSales: centreData.reduce((sum, d) => sum + d.sales, 0),
        avgEBITDA: centreData.reduce((sum, d) => sum + d.ebitda, 0) / centreData.length || 0,
        avgFoodCost: centreData.reduce((sum, d) => sum + d.foodCostPct, 0) / centreData.length || 0,
        avgLabor: centreData.reduce((sum, d) => sum + d.laborPct, 0) / centreData.length || 0,
      };

      // 4. Generate rankings
      const rankings = {
        byEBITDA: [...centreData]
          .sort((a, b) => b.ebitda - a.ebitda)
          .map(d => ({
            centroCode: d.centroCode,
            centroName: d.centroName,
            value: d.ebitda,
            badge: d.ebitda >= 15 ? "up" as const : d.ebitda >= 10 ? "neutral" as const : "down" as const,
          })),
        byLabor: [...centreData]
          .sort((a, b) => a.laborPct - b.laborPct)
          .map(d => ({
            centroCode: d.centroCode,
            centroName: d.centroName,
            value: d.laborPct,
            badge: d.laborPct <= 25 ? "down" as const : d.laborPct <= 30 ? "neutral" as const : "up" as const,
          })),
        byMargin: [...centreData]
          .sort((a, b) => b.netMargin - a.netMargin)
          .map(d => ({
            centroCode: d.centroCode,
            centroName: d.centroName,
            value: d.netMargin,
            badge: d.netMargin >= 10 ? "up" as const : d.netMargin >= 5 ? "neutral" as const : "down" as const,
          })),
      };

      // 5. Fetch monthly evolution (last 6 months)
      const monthlyEvolution = await fetchMonthlyEvolution(centroCodes.map(c => c.code), period);

      return {
        aggregated,
        rankings,
        monthlyEvolution,
        centreData,
      };
    },
    enabled: !!viewSelection,
  });
}

async function fetchCentreData(
  centroCode: string,
  centroName: string,
  period: { start: string; end: string }
): Promise<CentreData> {
  // Fetch P&L data
  const { data: plData } = await supabase.rpc("calculate_pnl", {
    p_centro_code: centroCode,
    p_start_date: period.start,
    p_end_date: period.end,
  });

  // Calculate KPIs
  const income = (plData || [])
    .filter((l: any) => l.account_type === "income")
    .reduce((sum: number, l: any) => sum + Math.abs(Number(l.balance || 0)), 0);

  const expenses = (plData || [])
    .filter((l: any) => l.account_type === "expense")
    .reduce((sum: number, l: any) => sum + Math.abs(Number(l.balance || 0)), 0);

  // Simplified cost breakdown (in real app, use specific account codes)
  const foodCost = expenses * 0.35; // ~35% of expenses
  const laborCost = expenses * 0.30; // ~30% of expenses
  const otherExpenses = expenses * 0.35; // ~35% of expenses

  const ebitda = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const netMargin = income > 0 ? ((income - expenses) / income) * 100 : 0;

  // Calculate IVA (21% of sales)
  const iva = income * 0.21;

  // Calculate CPLH (Cost Per Labor Hour) - simplified
  const estimatedHours = income / 100; // Rough estimate
  const cplh = estimatedHours > 0 ? laborCost / estimatedHours : 0;

  return {
    centroCode,
    centroName,
    sales: income,
    ebitda,
    foodCostPct: income > 0 ? (foodCost / income) * 100 : 0,
    laborPct: income > 0 ? (laborCost / income) * 100 : 0,
    cplh,
    iva,
    netMargin,
  };
}

async function fetchMonthlyEvolution(
  centroCodes: string[],
  period: { start: string; end: string }
): Promise<MonthlyEvolution[]> {
  const now = new Date();
  const months: MonthlyEvolution[] = [];

  // Generate last 6 months
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const startDate = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const endDate = format(endOfMonth(monthDate), "yyyy-MM-dd");
    const monthLabel = format(monthDate, "MMM yyyy");

    // Aggregate data for all centres
    let totalSales = 0;
    let totalFoodCost = 0;
    let totalLaborCost = 0;
    let totalOtherExpenses = 0;

    for (const code of centroCodes) {
      const { data: plData } = await supabase.rpc("calculate_pnl", {
        p_centro_code: code,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      const income = (plData || [])
        .filter((l: any) => l.account_type === "income")
        .reduce((sum: number, l: any) => sum + Math.abs(Number(l.balance || 0)), 0);

      const expenses = (plData || [])
        .filter((l: any) => l.account_type === "expense")
        .reduce((sum: number, l: any) => sum + Math.abs(Number(l.balance || 0)), 0);

      totalSales += income;
      totalFoodCost += expenses * 0.35;
      totalLaborCost += expenses * 0.30;
      totalOtherExpenses += expenses * 0.35;
    }

    months.push({
      month: monthLabel,
      sales: totalSales,
      foodCostPct: totalSales > 0 ? (totalFoodCost / totalSales) * 100 : 0,
      laborPct: totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0,
      otherExpensesPct: totalSales > 0 ? (totalOtherExpenses / totalSales) * 100 : 0,
    });
  }

  return months;
}
