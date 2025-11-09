import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CentreWithFranchisee {
  id: string;
  codigo: string;
  nombre: string;
  franchisee_id: string;
  activo: boolean;
  franchisee: {
    id: string;
    name: string;
  };
}

export interface FranchiseeWithCentres {
  id: string;
  name: string;
  centres: CentreWithFranchisee[];
}

/**
 * Hook to fetch ALL centres from ALL franchisees accessible to the current user
 * Groups centres by franchisee for display purposes
 */
export function useAllUserCentres() {
  return useQuery({
    queryKey: ["all-user-centres"],
    queryFn: async () => {
      // Get all centres accessible to the user
      const { data: userCentres, error: centresError } = await supabase
        .from("v_user_centres")
        .select("centro_code");

      if (centresError) throw centresError;

      const centreCodes = userCentres?.map(c => c.centro_code) || [];
      if (centreCodes.length === 0) {
        return [];
      }

      // Get full centre details with franchisee info
      const { data: centres, error: centresDataError } = await supabase
        .from("centres")
        .select(`
          *,
          franchisee:franchisee_id (
            id,
            name
          )
        `)
        .in("codigo", centreCodes)
        .eq("activo", true)
        .order("codigo");

      if (centresDataError) throw centresDataError;

      // Group centres by franchisee
      const franchiseeMap = new Map<string, FranchiseeWithCentres>();

      centres?.forEach((centre: any) => {
        const franchiseeId = centre.franchisee_id;
        const franchiseeName = centre.franchisee?.name || "Sin Franquiciado";

        if (!franchiseeMap.has(franchiseeId)) {
          franchiseeMap.set(franchiseeId, {
            id: franchiseeId,
            name: franchiseeName,
            centres: [],
          });
        }

        franchiseeMap.get(franchiseeId)?.centres.push({
          id: centre.id,
          codigo: centre.codigo,
          nombre: centre.nombre,
          franchisee_id: centre.franchisee_id,
          activo: centre.activo,
          franchisee: {
            id: franchiseeId,
            name: franchiseeName,
          },
        });
      });

      return Array.from(franchiseeMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    },
  });
}
