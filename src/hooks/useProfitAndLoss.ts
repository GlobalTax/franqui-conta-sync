import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PLLine {
  code: string;
  name: string;
  level: number;
  amount: number;
  percentage: number;
  isHeader?: boolean;
  highlight?: boolean;
  final?: boolean;
}

interface PLAccountBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  level: number;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export function useProfitAndLoss(centroCode: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["profit-and-loss", centroCode, startDate, endDate],
    queryFn: async () => {
      // Llamar a la función calculate_pnl
      const { data: rawData, error } = await supabase.rpc("calculate_pnl", {
        p_centro_code: centroCode,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      const accountBalances = (rawData || []) as PLAccountBalance[];

      // Calcular totales por grupo
      const income70 = accountBalances
        .filter((a) => a.account_code.startsWith("70"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const income75 = accountBalances
        .filter((a) => a.account_code.startsWith("75"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const totalIncome = income70 + income75;

      const expense60 = accountBalances
        .filter((a) => a.account_code.startsWith("60"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expense64 = accountBalances
        .filter((a) => a.account_code.startsWith("64"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expense640 = accountBalances
        .filter((a) => a.account_code.startsWith("640"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expense642 = accountBalances
        .filter((a) => a.account_code.startsWith("642"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expense62 = accountBalances
        .filter((a) => a.account_code.startsWith("62"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expense621 = accountBalances
        .filter((a) => a.account_code.startsWith("621"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expense628 = accountBalances
        .filter((a) => a.account_code.startsWith("628"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const otherExpenses62 = expense62 - expense621 - expense628;

      const expense68 = accountBalances
        .filter((a) => a.account_code.startsWith("68"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expense66 = accountBalances
        .filter((a) => a.account_code.startsWith("66"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const totalOperatingExpenses = expense60 + expense64 + expense62;

      const ebitda = totalIncome - totalOperatingExpenses;
      const ebit = ebitda - expense68;
      const bai = ebit - expense66;
      const tax = bai > 0 ? bai * 0.25 : 0;
      const netResult = bai - tax;

      // Construir estructura de P&L
      const plData: PLLine[] = [
        {
          code: "I",
          name: "INGRESOS",
          isHeader: true,
          level: 0,
          amount: totalIncome,
          percentage: 100,
        },
        {
          code: "I.1",
          name: "Ventas de mercaderías",
          level: 1,
          amount: income70,
          percentage: totalIncome > 0 ? (income70 / totalIncome) * 100 : 0,
        },
        {
          code: "I.2",
          name: "Otros ingresos",
          level: 1,
          amount: income75,
          percentage: totalIncome > 0 ? (income75 / totalIncome) * 100 : 0,
        },
        {
          code: "G",
          name: "GASTOS OPERATIVOS",
          isHeader: true,
          level: 0,
          amount: -totalOperatingExpenses,
          percentage: totalIncome > 0 ? (-totalOperatingExpenses / totalIncome) * 100 : 0,
        },
        {
          code: "G.1",
          name: "Compras y aprovisionamientos",
          level: 1,
          amount: -expense60,
          percentage: totalIncome > 0 ? (-expense60 / totalIncome) * 100 : 0,
        },
        {
          code: "G.2",
          name: "Gastos de personal",
          level: 1,
          amount: -expense64,
          percentage: totalIncome > 0 ? (-expense64 / totalIncome) * 100 : 0,
        },
        {
          code: "G.2.1",
          name: "Sueldos y salarios",
          level: 2,
          amount: -expense640,
          percentage: totalIncome > 0 ? (-expense640 / totalIncome) * 100 : 0,
        },
        {
          code: "G.2.2",
          name: "Seguridad Social",
          level: 2,
          amount: -expense642,
          percentage: totalIncome > 0 ? (-expense642 / totalIncome) * 100 : 0,
        },
        {
          code: "G.3",
          name: "Otros gastos de explotación",
          level: 1,
          amount: -expense62,
          percentage: totalIncome > 0 ? (-expense62 / totalIncome) * 100 : 0,
        },
        {
          code: "G.3.1",
          name: "Arrendamientos",
          level: 2,
          amount: -expense621,
          percentage: totalIncome > 0 ? (-expense621 / totalIncome) * 100 : 0,
        },
        {
          code: "G.3.2",
          name: "Suministros",
          level: 2,
          amount: -expense628,
          percentage: totalIncome > 0 ? (-expense628 / totalIncome) * 100 : 0,
        },
        {
          code: "G.3.3",
          name: "Otros servicios",
          level: 2,
          amount: -otherExpenses62,
          percentage: totalIncome > 0 ? (-otherExpenses62 / totalIncome) * 100 : 0,
        },
        {
          code: "EBITDA",
          name: "EBITDA",
          isHeader: true,
          level: 0,
          amount: ebitda,
          percentage: totalIncome > 0 ? (ebitda / totalIncome) * 100 : 0,
          highlight: true,
        },
        {
          code: "G.4",
          name: "Amortizaciones",
          level: 1,
          amount: -expense68,
          percentage: totalIncome > 0 ? (-expense68 / totalIncome) * 100 : 0,
        },
        {
          code: "EBIT",
          name: "EBIT (Resultado de Explotación)",
          isHeader: true,
          level: 0,
          amount: ebit,
          percentage: totalIncome > 0 ? (ebit / totalIncome) * 100 : 0,
          highlight: true,
        },
        {
          code: "F",
          name: "RESULTADO FINANCIERO",
          level: 0,
          amount: -expense66,
          percentage: totalIncome > 0 ? (-expense66 / totalIncome) * 100 : 0,
        },
        {
          code: "BAI",
          name: "BAI (Resultado antes de Impuestos)",
          isHeader: true,
          level: 0,
          amount: bai,
          percentage: totalIncome > 0 ? (bai / totalIncome) * 100 : 0,
          highlight: true,
        },
        {
          code: "I.T.",
          name: "Impuesto sobre Sociedades (25%)",
          level: 1,
          amount: -tax,
          percentage: totalIncome > 0 ? (-tax / totalIncome) * 100 : 0,
        },
        {
          code: "NET",
          name: "RESULTADO NETO",
          isHeader: true,
          level: 0,
          amount: netResult,
          percentage: totalIncome > 0 ? (netResult / totalIncome) * 100 : 0,
          highlight: true,
          final: true,
        },
      ];

      return {
        plData,
        summary: {
          netResult,
          ebitda,
          totalIncome,
          totalExpenses: totalOperatingExpenses,
          ebitdaMargin: totalIncome > 0 ? (ebitda / totalIncome) * 100 : 0,
          netMargin: totalIncome > 0 ? (netResult / totalIncome) * 100 : 0,
          grossMargin: totalIncome > 0 ? ((totalIncome - expense60) / totalIncome) * 100 : 0,
          operatingMargin: totalIncome > 0 ? (ebit / totalIncome) * 100 : 0,
        },
      };
    },
    enabled: !!centroCode && !!startDate && !!endDate,
  });
}
