import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PLReportLine, PLReportLineAccumulated, PLReportSummary, PLReportParams } from "@/types/profit-loss";

/**
 * Hook para calcular el informe de P&L dinámicamente
 * Soporta vista consolidada (company) o individual (centre)
 * Soporta vista dual (mes + acumulado) cuando showAccumulated=true
 */
export const usePLReport = ({
  templateCode,
  companyId,
  centroCode,
  centroCodes,
  startDate,
  endDate,
  showAccumulated = false,
  periodDate,
}: PLReportParams) => {
  return useQuery({
    queryKey: ["pl-report", templateCode, companyId, centroCode, centroCodes, startDate, endDate, showAccumulated, periodDate],
    queryFn: async () => {
      // Vista dual: Mes + Acumulado
      if (showAccumulated && periodDate) {
        const { data, error } = await supabase.rpc(
          "calculate_pl_report_accumulated" as any,
          {
            p_template_code: templateCode,
            p_company_id: companyId || null,
            p_centro_code: centroCode || null,
            p_period_date: periodDate,
            p_show_accumulated: true,
          }
        );

        if (error) throw error;

        const plDataAccumulated = (data || []) as any as PLReportLineAccumulated[];
        
        // Calcular summary usando datos del periodo
        const summaryData: PLReportLine[] = plDataAccumulated.map(line => ({
          ...line,
          amount: line.amount_period,
          percentage: line.percentage_period,
        }));

        return {
          plData: plDataAccumulated,
          summary: calculateSummary(summaryData),
        };
      }
      // Si hay múltiples centros, usar RPC consolidado
      if (centroCodes && centroCodes.length > 0) {
        const { data, error } = await supabase.rpc(
          "calculate_pl_report_consolidated" as any, // Temporal: función aún no en tipos
          {
            p_template_code: templateCode,
            p_centro_codes: centroCodes,
            p_start_date: startDate || null,
            p_end_date: endDate || null,
          }
        );

        if (error) throw error;

        const plData: PLReportLine[] = (data || []).map((row: any) => ({
          rubric_code: row.rubric_code,
          rubric_name: row.rubric_name,
          parent_code: row.parent_code,
          level: row.level,
          sort: row.sort,
          is_total: row.is_total,
          amount: row.amount,
          sign: row.sign,
          percentage: row.percentage,
        }));

        const summary = calculateSummary(plData);
        return { plData, summary };
      }

      // RPC individual (centro o compañía)
      const { data, error } = await supabase.rpc("calculate_pl_report", {
        p_template_code: templateCode,
        p_company_id: companyId || null,
        p_centro_code: centroCode || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) throw error;

      const plData = (data || []) as PLReportLine[];

      // Calcular montos ajustados con signo correcto
      const adjustedData = plData.map((line) => {
        const adjustedAmount = line.sign === 'invert' ? -line.amount : line.amount;
        return {
          ...line,
          amount: adjustedAmount,
        };
      });

      // Calcular summary con métricas clave
      const summary = calculateSummary(adjustedData);

      // Calcular porcentajes sobre ventas
      const dataWithPercentages = adjustedData.map((line) => ({
        ...line,
        percentage: summary.totalIncome !== 0 
          ? (line.amount / Math.abs(summary.totalIncome)) * 100 
          : 0,
      }));

      return {
        plData: dataWithPercentages,
        summary,
      };
    },
    enabled: !!templateCode && (!!companyId || !!centroCode || (!!centroCodes && centroCodes.length > 0)),
  }) as any; // Type assertion due to conditional return type
};

/**
 * Calcula el resumen del P&L con métricas clave
 */
function calculateSummary(plData: PLReportLine[]): PLReportSummary {
  // Buscar rubros clave por código
  const findRubric = (code: string) => 
    plData.find((line) => line.rubric_code === code)?.amount || 0;

  const totalIncome = Math.abs(findRubric('ingresos') || findRubric('revenue'));
  const grossMargin = findRubric('margen_bruto') || findRubric('gross_margin');
  const ebitda = findRubric('ebitda');
  const ebit = findRubric('ebit');
  const netResult = findRubric('resultado_neto') || ebit;

  // Calcular gastos totales (aproximación)
  const compras = findRubric('compras') || findRubric('food') + findRubric('paper');
  const gastosPersonal = findRubric('gastos_personal') || findRubric('labor');
  const otrosGastos = findRubric('otros_gastos') || 
    findRubric('opex') + findRubric('royalty') + findRubric('marketing');
  const amortizacion = findRubric('amortizacion') || findRubric('depreciation');
  
  const totalExpenses = compras + gastosPersonal + otrosGastos + amortizacion;

  return {
    totalIncome,
    totalExpenses,
    grossMargin,
    ebitda,
    ebit,
    netResult,
    grossMarginPercent: totalIncome !== 0 ? (grossMargin / totalIncome) * 100 : 0,
    ebitdaMarginPercent: totalIncome !== 0 ? (ebitda / totalIncome) * 100 : 0,
    ebitMarginPercent: totalIncome !== 0 ? (ebit / totalIncome) * 100 : 0,
    netMarginPercent: totalIncome !== 0 ? (netResult / totalIncome) * 100 : 0,
  };
}
