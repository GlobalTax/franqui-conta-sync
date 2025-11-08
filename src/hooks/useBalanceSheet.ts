import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BalanceSheetItem {
  grupo: string;
  nombre_grupo: string;
  balance: number;
}

export const useBalanceSheet = (centroCode: string, fechaCorte: string) => {
  return useQuery({
    queryKey: ["balance-sheet", centroCode, fechaCorte],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_balance_sheet", {
        p_centro_code: centroCode,
        p_fecha_corte: fechaCorte,
      });

      if (error) throw error;

      const items = (data || []) as BalanceSheetItem[];

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
          total: activo - pasivo - patrimonioNeto, // Debería ser 0 si está cuadrado
        },
      };
    },
    enabled: !!centroCode && !!fechaCorte,
  });
};
