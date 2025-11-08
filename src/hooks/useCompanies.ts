import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Company {
  id: string;
  franchisee_id: string;
  razon_social: string;
  cif: string;
  tipo_sociedad: string;
  activo: boolean;
  centres: Array<{
    id: string;
    codigo: string;
    nombre: string;
    activo: boolean;
  }>;
}

export const useCompanies = (franchiseeId?: string) => {
  return useQuery({
    queryKey: ["companies", franchiseeId],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select(`
          id,
          franchisee_id,
          razon_social,
          cif,
          tipo_sociedad,
          activo,
          centres:centres(id, codigo, nombre, activo)
        `)
        .eq("activo", true)
        .order("razon_social");

      if (franchiseeId) {
        query = query.eq("franchisee_id", franchiseeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as Company[];
    },
    enabled: !!franchiseeId,
  });
};
