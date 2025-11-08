import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CentreCompany {
  id: string;
  centre_id: string;
  razon_social: string;
  cif: string;
  tipo_sociedad: string;
  es_principal: boolean;
  activo: boolean;
}

export const useCentreCompanies = (centreId?: string) => {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["centre-companies", centreId],
    queryFn: async () => {
      if (!centreId) return [];
      
      const { data, error } = await supabase
        .from("centre_companies")
        .select("*")
        .eq("centre_id", centreId)
        .eq("activo", true)
        .order("es_principal", { ascending: false });

      if (error) throw error;
      return data as CentreCompany[];
    },
    enabled: !!centreId,
  });

  const principalCompany = companies?.find(c => c.es_principal) || companies?.[0];

  return {
    companies: companies || [],
    principalCompany,
    isLoading,
  };
};
