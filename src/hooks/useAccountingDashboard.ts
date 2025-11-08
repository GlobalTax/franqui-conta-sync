import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useView } from "@/contexts/ViewContext";

export interface AccountingKPIs {
  total_activo: number;
  total_pasivo: number;
  total_patrimonio: number;
  resultado_ejercicio: number;
  liquidez: number;
  solvencia: number;
  endeudamiento: number;
}

export interface MonthlyEvolution {
  mes: string;
  ingresos: number;
  gastos: number;
  resultado: number;
}

export interface AccountGroup {
  grupo: string;
  nombre: string;
  saldo: number;
}

export const useAccountingKPIs = (startDate: string, endDate: string) => {
  const { selectedView } = useView();

  return useQuery({
    queryKey: ["accounting-kpis", selectedView?.id, startDate, endDate],
    queryFn: async () => {
      if (!selectedView || selectedView.type !== 'centre') {
        throw new Error("No hay centro seleccionado");
      }

      // Calcular activo (grupos 2, 3, 4 deudor, 5)
      const { data: activoData } = await supabase.rpc("calculate_balance_sheet" as any, {
        p_centro_code: selectedView.id,
        p_fecha_corte: endDate,
      });

      const activo = (activoData || [])
        .filter((g: any) => ['2', '3', '4', '5'].includes(g.grupo))
        .reduce((sum: number, g: any) => sum + (g.balance || 0), 0);

      // Calcular pasivo y patrimonio
      const pasivo = (activoData || [])
        .filter((g: any) => g.grupo === '4' && g.balance < 0)
        .reduce((sum: number, g: any) => sum + Math.abs(g.balance || 0), 0);

      const patrimonio = (activoData || [])
        .filter((g: any) => g.grupo === '1')
        .reduce((sum: number, g: any) => sum + Math.abs(g.balance || 0), 0);

      // Calcular resultado del ejercicio (ingresos - gastos)
      const { data: pnlData } = await supabase.rpc("calculate_pnl" as any, {
        p_centro_code: selectedView.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      const ingresos = (pnlData || [])
        .filter((a: any) => a.account_type === 'income')
        .reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

      const gastos = (pnlData || [])
        .filter((a: any) => a.account_type === 'expense')
        .reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

      const resultado = ingresos - gastos;

      // Calcular ratios
      const liquidez = pasivo > 0 ? activo / pasivo : 0;
      const solvencia = (pasivo + patrimonio) > 0 ? activo / (pasivo + patrimonio) : 0;
      const endeudamiento = (pasivo + patrimonio) > 0 ? pasivo / (pasivo + patrimonio) : 0;

      return {
        total_activo: activo,
        total_pasivo: pasivo,
        total_patrimonio: patrimonio,
        resultado_ejercicio: resultado,
        liquidez,
        solvencia,
        endeudamiento,
      } as AccountingKPIs;
    },
    enabled: !!selectedView && selectedView.type === 'centre',
  });
};

export const useMonthlyEvolution = (year: number) => {
  const { selectedView } = useView();

  return useQuery({
    queryKey: ["monthly-evolution", selectedView?.id, year],
    queryFn: async () => {
      if (!selectedView || selectedView.type !== 'centre') {
        throw new Error("No hay centro seleccionado");
      }

      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const evolution: MonthlyEvolution[] = [];

      for (const month of months) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const { data: pnlData } = await supabase.rpc("calculate_pnl" as any, {
          p_centro_code: selectedView.id,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        const ingresos = (pnlData || [])
          .filter((a: any) => a.account_type === 'income')
          .reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

        const gastos = (pnlData || [])
          .filter((a: any) => a.account_type === 'expense')
          .reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

        evolution.push({
          mes: new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'short' }),
          ingresos,
          gastos,
          resultado: ingresos - gastos,
        });
      }

      return evolution;
    },
    enabled: !!selectedView && selectedView.type === 'centre',
  });
};

export const useAccountGroups = (startDate: string, endDate: string, type: 'income' | 'expense') => {
  const { selectedView } = useView();

  return useQuery({
    queryKey: ["account-groups", selectedView?.id, startDate, endDate, type],
    queryFn: async () => {
      if (!selectedView || selectedView.type !== 'centre') {
        throw new Error("No hay centro seleccionado");
      }

      const { data } = await supabase.rpc("calculate_pnl" as any, {
        p_centro_code: selectedView.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      const filtered = (data || [])
        .filter((a: any) => a.account_type === type && a.level === 1)
        .map((a: any) => ({
          grupo: a.account_code,
          nombre: a.account_name,
          saldo: Math.abs(a.balance || 0),
        }));

      return filtered as AccountGroup[];
    },
    enabled: !!selectedView && selectedView.type === 'centre',
  });
};
