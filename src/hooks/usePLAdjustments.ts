import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PLAdjustment } from "@/types/profit-loss";

/**
 * Hook para gestionar ajustes manuales de P&L
 */
export const usePLAdjustments = (
  companyId: string | undefined,
  centroCode: string | undefined,
  templateCode: string,
  periodDate: string // YYYY-MM-DD
) => {
  const queryClient = useQueryClient();

  // Fetch ajustes existentes
  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["pl-adjustments", companyId, centroCode, templateCode, periodDate],
    queryFn: async () => {
      let query = (supabase as any)
        .from("pl_manual_adjustments")
        .select("*")
        .eq("template_code", templateCode)
        .eq("period_date", periodDate);

      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      if (centroCode) {
        query = query.eq("centro_code", centroCode);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PLAdjustment[];
    },
    enabled: !!templateCode && !!periodDate && (!!companyId || !!centroCode),
  });

  // Mutation para crear/actualizar ajuste
  const upsertAdjustment = useMutation({
    mutationFn: async ({
      rubricCode,
      amount,
      notes,
    }: {
      rubricCode: string;
      amount: number;
      notes?: string;
    }) => {
      if (!centroCode) {
        throw new Error("Centro code es requerido");
      }

      const { data, error } = await (supabase as any)
        .from("pl_manual_adjustments")
        .upsert({
          company_id: companyId || null,
          centro_code: centroCode,
          template_code: templateCode,
          rubric_code: rubricCode,
          period_date: periodDate,
          adjustment_amount: amount,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pl-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["pl-report"] });
      toast.success(`Ajuste guardado para ${data.rubric_code}`);
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar ajuste: ${error.message}`);
    },
  });

  // Mutation para eliminar ajuste
  const deleteAdjustment = useMutation({
    mutationFn: async (adjustmentId: string) => {
      const { error } = await (supabase as any)
        .from("pl_manual_adjustments")
        .delete()
        .eq("id", adjustmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pl-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["pl-report"] });
      toast.success("Ajuste eliminado");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar ajuste: ${error.message}`);
    },
  });

  // Helper para obtener ajuste de un rubric específico
  const getAdjustmentForRubric = (rubricCode: string): PLAdjustment | undefined => {
    return adjustments?.find((adj) => adj.rubric_code === rubricCode);
  };

  // Helper para obtener monto de ajuste de un rubric
  const getAdjustmentAmount = (rubricCode: string): number => {
    return getAdjustmentForRubric(rubricCode)?.adjustment_amount || 0;
  };

  return {
    adjustments: adjustments || [],
    isLoading,
    upsertAdjustment,
    deleteAdjustment,
    getAdjustmentForRubric,
    getAdjustmentAmount,
  };
};
