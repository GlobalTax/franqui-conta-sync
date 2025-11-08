import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";

export const useEvolutionCharts = (centroCode: string, months: number = 6) => {
  return useQuery({
    queryKey: ["evolution-charts", centroCode, months],
    queryFn: async () => {
      const monthsData = [];
      const now = new Date();

      // Calcular últimos N meses
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const startDate = startOfMonth(monthDate);
        const endDate = endOfMonth(monthDate);

        const { data } = await supabase.rpc("calculate_pnl", {
          p_centro_code: centroCode,
          p_start_date: format(startDate, "yyyy-MM-dd"),
          p_end_date: format(endDate, "yyyy-MM-dd"),
        });

        const income = data
          ?.filter((item: any) => item.account_type === "income")
          .reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0) || 0;

        const expenses = data
          ?.filter((item: any) => item.account_type === "expense")
          .reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0) || 0;

        monthsData.push({
          month: format(monthDate, "MMM yyyy"),
          income,
          expenses,
        });
      }

      // Distribución de gastos por categoría (último mes)
      const lastMonthStart = startOfMonth(now);
      const lastMonthEnd = endOfMonth(now);

      const { data: expenseCategories } = await supabase.rpc("calculate_pnl", {
        p_centro_code: centroCode,
        p_start_date: format(lastMonthStart, "yyyy-MM-dd"),
        p_end_date: format(lastMonthEnd, "yyyy-MM-dd"),
      });

      const categories = expenseCategories
        ?.filter((item: any) => item.account_type === "expense" && Number(item.balance) > 0)
        .map((item: any) => ({
          name: item.account_name,
          value: Number(item.balance),
        })) || [];

      return {
        monthlyTrend: monthsData,
        expenseCategories: categories,
      };
    },
    enabled: !!centroCode,
  });
};
