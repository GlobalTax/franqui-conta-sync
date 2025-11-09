import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useView } from "@/contexts/ViewContext";
import { CloseAccountingPeriodUseCase } from "@/domain/accounting/use-cases/CloseAccountingPeriod";

export interface ClosingPeriod {
  id: string;
  centro_code: string;
  period_type: 'monthly' | 'annual';
  period_year: number;
  period_month: number | null;
  status: 'open' | 'closed';
  closing_date: string | null;
  closing_entry_id: string | null;
  regularization_entry_id: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ClosePeriodParams {
  centroCode: string;
  year: number;
  month?: number;
  notes?: string;
}

export const useClosingPeriods = (year?: number) => {
  const { selectedView } = useView();

  return useQuery({
    queryKey: ["closing-periods", selectedView?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_closing_periods" as any, {
        p_centro_code: selectedView?.type === 'centre' ? selectedView.id : null,
        p_year: year || null,
      });

      if (error) throw error;
      return (data || []) as ClosingPeriod[];
    },
    enabled: !!selectedView,
  });
};

export const useClosePeriod = () => {
  const queryClient = useQueryClient();
  const closePeriodUseCase = new CloseAccountingPeriodUseCase();

  return useMutation({
    mutationFn: async ({ centroCode, year, month, notes }: ClosePeriodParams) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuario no autenticado");

      return await closePeriodUseCase.execute({
        centroCode,
        periodYear: year,
        periodMonth: month,
        notes,
        userId: user.user.id,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["closing-periods"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      
      const periodType = data.closedPeriod.period_type === 'monthly' ? 'mensual' : 'anual';
      toast.success(`Período ${periodType} cerrado correctamente`);
      
      if (data.warnings.length > 0) {
        data.warnings.forEach(warning => toast.info(warning));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cerrar el período");
    },
  });
};
