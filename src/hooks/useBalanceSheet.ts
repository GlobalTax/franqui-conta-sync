import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";

interface BalanceSheetItem {
  grupo: string;
  nombre_grupo: string;
  balance: number;
}

// Función auxiliar para consolidar balances
const consolidateBalances = (balances: BalanceSheetItem[][]): BalanceSheetItem[] => {
  const consolidated: Record<string, { nombre_grupo: string; balance: number }> = {};
  
  balances.forEach(balance => {
    balance?.forEach((item) => {
      const key = item.grupo;
      if (!consolidated[key]) {
        consolidated[key] = { nombre_grupo: item.nombre_grupo, balance: 0 };
      }
      consolidated[key].balance += Number(item.balance);
    });
  });

  return Object.entries(consolidated).map(([grupo, data]) => ({
    grupo,
    nombre_grupo: data.nombre_grupo,
    balance: data.balance,
  }));
};

export const useBalanceSheet = (
  viewSelection: ViewSelection | null,
  fechaCorte: string
) => {
  return useQuery({
    queryKey: ["balance-sheet", viewSelection, fechaCorte],
    queryFn: async () => {
      if (!viewSelection) return null;

      let items: BalanceSheetItem[] = [];

      if (viewSelection.type === 'company') {
        // Vista consolidada: obtener todos los centros de la sociedad
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        if (!centres || centres.length === 0) {
          return null;
        }

        // Consolidar datos de todos los centros
        const promises = centres.map(c =>
          supabase.rpc("calculate_balance_sheet", {
            p_centro_code: c.codigo,
            p_fecha_corte: fechaCorte,
          })
        );

        const results = await Promise.all(promises);
        const allBalances = results
          .map(r => (r.data || []) as BalanceSheetItem[])
          .filter(b => b.length > 0);
        
        items = consolidateBalances(allBalances);
      } else {
        // Vista individual: solo ese centro
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", viewSelection.id)
          .single();

        if (!centre) return null;

        const { data, error } = await supabase.rpc("calculate_balance_sheet", {
          p_centro_code: centre.codigo,
          p_fecha_corte: fechaCorte,
        });

        if (error) throw error;
        items = (data || []) as BalanceSheetItem[];
      }

      // Agrupar en Activo, Pasivo y Patrimonio Neto
      const activo = items
        .filter((i) => ["2", "3", "5"].includes(i.grupo))
        .reduce((sum, i) => sum + Number(i.balance), 0);

      const pasivo = items
        .filter((i) => i.grupo === "4")
        .reduce((sum, i) => sum + Number(i.balance), 0);

      const patrimonioNeto = items
        .filter((i) => i.grupo === "1")
        .reduce((sum, i) => sum + Number(i.balance), 0);

      return {
        items,
        totals: {
          activo,
          pasivo,
          patrimonioNeto,
          total: activo - pasivo - patrimonioNeto,
        },
      };
    },
    enabled: !!viewSelection && !!fechaCorte,
  });
};
