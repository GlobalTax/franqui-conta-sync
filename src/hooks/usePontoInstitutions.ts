import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PontoInstitution {
  id: string;
  attributes: {
    name: string;
    bic: string;
    logoUrl: string | null;
    country: string;
    status: string;
  };
}

export const usePontoInstitutions = (country: string = "BE") => {
  return useQuery({
    queryKey: ["ponto-institutions", country],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "ponto-institutions",
        {
          body: { country },
        }
      );

      if (error) throw error;
      return (data?.institutions || []) as PontoInstitution[];
    },
    staleTime: 1000 * 60 * 60, // Cache 1 hour
  });
};
