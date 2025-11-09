import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompanies(franchiseeId?: string) {
  return useQuery({
    queryKey: ["companies", franchiseeId],
    queryFn: async () => {
      if (!franchiseeId) return [];

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("franchisee_id", franchiseeId)
        .eq("activo", true)
        .order("razon_social");

      if (error) throw error;
      return data || [];
    },
    enabled: !!franchiseeId,
  });
}
