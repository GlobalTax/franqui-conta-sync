import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";

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

// Función para consolidar balances de P&L
const consolidatePLBalances = (balances: PLAccountBalance[][]): PLAccountBalance[] => {
  const consolidated: Record<string, PLAccountBalance> = {};
  
  balances.forEach(balance => {
    balance?.forEach((item) => {
      const key = item.account_code;
      if (!consolidated[key]) {
        consolidated[key] = { ...item, balance: 0, debit_total: 0, credit_total: 0 };
      }
      consolidated[key].balance += Number(item.balance);
      consolidated[key].debit_total += Number(item.debit_total);
      consolidated[key].credit_total += Number(item.credit_total);
    });
  });

  return Object.values(consolidated);
};

export function useProfitAndLoss(
  viewSelection: ViewSelection | null,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["profit-and-loss", viewSelection, startDate, endDate],
    queryFn: async () => {
      if (!viewSelection) return null;

      let rawData: PLAccountBalance[] = [];

      if (viewSelection.type === 'company') {
        // Vista consolidada
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        if (!centres || centres.length === 0) return null;

        const promises = centres.map(c =>
          supabase.rpc("calculate_pnl", {
            p_centro_code: c.codigo,
            p_start_date: startDate,
            p_end_date: endDate,
          })
        );

        const results = await Promise.all(promises);
        const allBalances = results
          .map(r => (r.data || []) as PLAccountBalance[])
          .filter(b => b.length > 0);
        
        rawData = consolidatePLBalances(allBalances);
      } else {
        // Vista individual
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", viewSelection.id)
          .single();

        if (!centre) return null;

        const { data, error } = await supabase.rpc("calculate_pnl", {
          p_centro_code: centre.codigo,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (error) throw error;
        rawData = (data || []) as PLAccountBalance[];
      }

      const accounts = rawData;

      // Calcular totales por grupo
      const income70 = accounts
        .filter((a) => a.account_code.startsWith("70"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const income75 = accounts
        .filter((a) => a.account_code.startsWith("75"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const totalIncome = income70 + income75;

      const expenses60 = accounts
        .filter((a) => a.account_code.startsWith("60"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expenses61 = accounts
        .filter((a) => a.account_code.startsWith("61"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expenses62 = accounts
        .filter((a) => a.account_code.startsWith("62"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expenses64 = accounts
        .filter((a) => a.account_code.startsWith("64"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expenses65 = accounts
        .filter((a) => a.account_code.startsWith("65"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const expenses68 = accounts
        .filter((a) => a.account_code.startsWith("68"))
        .reduce((sum, a) => sum + Number(a.balance), 0);

      const totalExpenses = expenses60 + expenses61 + expenses62 + expenses64 + expenses65 + expenses68;

      const grossResult = totalIncome - expenses60;
      const operatingResult = grossResult - (expenses61 + expenses62 + expenses64);
      const ebitda = operatingResult;
      const ebit = ebitda - expenses68;
      const netResult = ebit - expenses65;

      // Construir datos de P&L en formato de presentación
      const plData: PLLine[] = [
        // INGRESOS
        {
          code: "7",
          name: "INGRESOS DE EXPLOTACIÓN",
          level: 0,
          amount: totalIncome,
          percentage: 100,
          isHeader: true,
        },
        {
          code: "70",
          name: "Ventas de mercaderías, producción propia",
          level: 1,
          amount: income70,
          percentage: totalIncome ? (income70 / totalIncome) * 100 : 0,
        },
        {
          code: "75",
          name: "Otros ingresos de gestión",
          level: 1,
          amount: income75,
          percentage: totalIncome ? (income75 / totalIncome) * 100 : 0,
        },

        // GASTOS OPERATIVOS
        {
          code: "60",
          name: "Compras",
          level: 1,
          amount: -expenses60,
          percentage: totalIncome ? (expenses60 / totalIncome) * 100 : 0,
        },
        {
          code: "",
          name: "MARGEN BRUTO",
          level: 0,
          amount: grossResult,
          percentage: totalIncome ? (grossResult / totalIncome) * 100 : 0,
          highlight: true,
          isHeader: true,
        },
        {
          code: "61",
          name: "Variación de existencias",
          level: 1,
          amount: -expenses61,
          percentage: totalIncome ? (expenses61 / totalIncome) * 100 : 0,
        },
        {
          code: "62",
          name: "Servicios exteriores",
          level: 1,
          amount: -expenses62,
          percentage: totalIncome ? (expenses62 / totalIncome) * 100 : 0,
        },
        {
          code: "64",
          name: "Gastos de personal",
          level: 1,
          amount: -expenses64,
          percentage: totalIncome ? (expenses64 / totalIncome) * 100 : 0,
        },
        {
          code: "",
          name: "EBITDA",
          level: 0,
          amount: ebitda,
          percentage: totalIncome ? (ebitda / totalIncome) * 100 : 0,
          highlight: true,
          isHeader: true,
        },
        {
          code: "68",
          name: "Dotaciones para amortizaciones",
          level: 1,
          amount: -expenses68,
          percentage: totalIncome ? (expenses68 / totalIncome) * 100 : 0,
        },
        {
          code: "",
          name: "EBIT (Resultado de Explotación)",
          level: 0,
          amount: ebit,
          percentage: totalIncome ? (ebit / totalIncome) * 100 : 0,
          highlight: true,
          isHeader: true,
        },
        {
          code: "65",
          name: "Gastos financieros",
          level: 1,
          amount: -expenses65,
          percentage: totalIncome ? (expenses65 / totalIncome) * 100 : 0,
        },
        {
          code: "",
          name: "RESULTADO NETO",
          level: 0,
          amount: netResult,
          percentage: totalIncome ? (netResult / totalIncome) * 100 : 0,
          final: true,
          highlight: true,
          isHeader: true,
        },
      ];

      return {
        plData,
        summary: {
          netResult,
          ebitda,
          totalIncome,
          totalExpenses,
          grossMargin: totalIncome ? (grossResult / totalIncome) * 100 : 0,
          operatingMargin: totalIncome ? (operatingResult / totalIncome) * 100 : 0,
          ebitdaMargin: totalIncome ? (ebitda / totalIncome) * 100 : 0,
          netMargin: totalIncome ? (netResult / totalIncome) * 100 : 0,
        },
      };
    },
    enabled: !!viewSelection && !!startDate && !!endDate,
  });
}
