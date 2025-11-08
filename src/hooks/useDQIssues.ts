import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDQIssues = (filters?: {
  tipo?: string;
  severidad?: string;
  centro?: string;
  resuelto?: boolean;
}) => {
  return useQuery({
    queryKey: ["dq-issues", filters],
    queryFn: async () => {
      let query = supabase
        .from("dq_issues")
        .select("*, employee:employees(*)")
        .order("created_at", { ascending: false });

      if (filters?.tipo) query = query.eq("tipo", filters.tipo);
      if (filters?.severidad) {
        query = query.eq("severidad", filters.severidad as any);
      }
      if (filters?.centro) query = query.eq("centro", filters.centro);
      if (filters?.resuelto !== undefined) query = query.eq("resuelto", filters.resuelto);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useResolveDQIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notas }: { id: string; notas?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Get current issue to merge notes
      const { data: currentIssue } = await supabase
        .from("dq_issues")
        .select("detalle")
        .eq("id", id)
        .single();

      const updatedDetalle = currentIssue?.detalle 
        ? { ...(currentIssue.detalle as any), notas_resolucion: notas }
        : { notas_resolucion: notas };

      const { error } = await supabase
        .from("dq_issues")
        .update({
          resuelto: true,
          resuelto_at: new Date().toISOString(),
          resuelto_por: user.id,
          detalle: updatedDetalle,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dq-issues"] });
      queryClient.invalidateQueries({ queryKey: ["dq-stats"] });
      toast.success("Issue marcado como resuelto");
    },
    onError: (error: any) => {
      toast.error("Error al resolver el issue: " + error.message);
    },
  });
};

export const useRunDQCheck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      start_date,
      end_date,
      centro,
    }: {
      start_date: string;
      end_date: string;
      centro?: string;
    }) => {
      const { data, error } = await supabase.rpc("detect_dq_issues", {
        p_start_date: start_date,
        p_end_date: end_date,
        p_centro: centro || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["dq-issues"] });
      queryClient.invalidateQueries({ queryKey: ["dq-stats"] });
      toast.success(`Análisis completado: ${data[0]?.issues_detected || 0} issues detectados`);
    },
    onError: (error: any) => {
      toast.error("Error al ejecutar el análisis: " + error.message);
    },
  });
};

export const useDQStats = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["dq-stats", startDate, endDate],
    queryFn: async () => {
      // Total issues activos
      const { count: totalActivos } = await supabase
        .from("dq_issues")
        .select("*", { count: "exact", head: true })
        .eq("resuelto", false);

      // Issues críticos
      const { count: criticos } = await supabase
        .from("dq_issues")
        .select("*", { count: "exact", head: true })
        .eq("resuelto", false)
        .eq("severidad", "critica");

      // Tasa de resolución en rango de fechas
      let tasaResolucion = 0;
      if (startDate && endDate) {
        const { count: totalCreados } = await supabase
          .from("dq_issues")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        const { count: totalResueltos } = await supabase
          .from("dq_issues")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .eq("resuelto", true);

        tasaResolucion =
          totalCreados && totalCreados > 0
            ? Math.round(((totalResueltos || 0) / totalCreados) * 100)
            : 0;
      }

      return {
        totalActivos: totalActivos || 0,
        criticos: criticos || 0,
        tasaResolucion,
      };
    },
  });
};
