import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PLTemplate } from "@/types/profit-loss";

/**
 * Hook para obtener plantillas de P&L activas
 */
export const usePLTemplates = () => {
  return useQuery({
    queryKey: ["pl-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pl_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      return data as unknown as PLTemplate[];
    },
    // ✅ OPTIMIZACIÓN: Caché largo para datos casi estáticos
    staleTime: 30 * 60 * 1000,      // 30 minutos
    gcTime: 60 * 60 * 1000,         // 1 hora en memoria
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook para obtener una plantilla específica por código
 */
export const usePLTemplate = (code: string) => {
  return useQuery({
    queryKey: ["pl-template", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pl_templates" as any)
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data as unknown as PLTemplate;
    },
    enabled: !!code,
  });
};

/**
 * Hook para obtener rubros de una plantilla
 */
export const usePLRubrics = (templateId: string) => {
  return useQuery({
    queryKey: ["pl-rubrics", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pl_rubrics" as any)
        .select("*")
        .eq("template_id", templateId)
        .order("sort");

      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
};
