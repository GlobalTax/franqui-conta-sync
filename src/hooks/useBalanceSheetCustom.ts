import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewSelection } from "@/contexts/ViewContext";

export interface BalanceSheetCustomRow {
  rubric_code: string;
  rubric_name: string;
  parent_code: string | null;
  level: number;
  sort: number;
  section: "activo" | "pasivo" | "patrimonio_neto";
  is_total: boolean;
  amount: number;
}

export interface BalanceSheetTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para obtener plantillas de balance disponibles
 */
export const useBalanceSheetTemplates = () => {
  return useQuery({
    queryKey: ["balance-sheet-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bs_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as BalanceSheetTemplate[];
    },
  });
};

/**
 * Hook para calcular balance según template custom
 */
export const useBalanceSheetCustom = (
  templateCode: string | null,
  viewSelection: ViewSelection | null,
  fechaCorte: string
) => {
  return useQuery({
    queryKey: ["balance-sheet-custom", templateCode, viewSelection, fechaCorte],
    queryFn: async (): Promise<BalanceSheetCustomRow[] | null> => {
      if (!viewSelection || !templateCode) return null;

      if (viewSelection.type === "company") {
        // Vista consolidada: obtener todos los centros de la sociedad
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", viewSelection.id)
          .eq("activo", true);

        if (!centres || centres.length === 0) {
          return null;
        }

        const centroCodes = centres.map((c) => c.codigo);

        // Llamar RPC consolidado
        const { data, error } = await supabase.rpc(
          "calculate_balance_sheet_custom_consolidated",
          {
            p_template_code: templateCode,
            p_centro_codes: centroCodes,
            p_fecha_corte: fechaCorte,
          }
        );

        if (error) throw error;
        return (data || []) as BalanceSheetCustomRow[];
      } else {
        // Vista individual: solo ese centro
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", viewSelection.id)
          .single();

        if (!centre) return null;

        const { data, error } = await supabase.rpc(
          "calculate_balance_sheet_custom",
          {
            p_template_code: templateCode,
            p_centro_code: centre.codigo,
            p_fecha_corte: fechaCorte,
          }
        );

        if (error) throw error;
        return (data || []) as BalanceSheetCustomRow[];
      }
    },
    enabled: !!viewSelection && !!templateCode && !!fechaCorte,
  });
};
