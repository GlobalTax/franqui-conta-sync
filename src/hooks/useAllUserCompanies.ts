import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyWithFranchisee {
  id: string;
  razon_social: string;
  cif: string;
  tipo_sociedad: string;
  franchisee_id: string;
  activo: boolean;
  franchisee: {
    id: string;
    name: string;
  };
}

export interface FranchiseeWithCompanies {
  id: string;
  name: string;
  companies: CompanyWithFranchisee[];
}

/**
 * Hook to fetch ALL companies from ALL franchisees accessible to the current user
 * Groups companies by franchisee for display purposes
 */
export function useAllUserCompanies() {
  return useQuery({
    queryKey: ["all-user-companies"],
    queryFn: async () => {
      // First, get all centres accessible to the user
      const { data: userCentres, error: centresError } = await supabase
        .from("v_user_centres")
        .select("centro_code");

      if (centresError) throw centresError;

      const centreCodes = userCentres?.map(c => c.centro_code) || [];
      if (centreCodes.length === 0) {
        return [];
      }

      // Get franchisee IDs from these centres
      const { data: centres, error: centresDataError } = await supabase
        .from("centres")
        .select("franchisee_id")
        .in("codigo", centreCodes);

      if (centresDataError) throw centresDataError;

      // Get unique franchisee IDs
      const franchiseeIds = [...new Set(centres?.map(c => c.franchisee_id).filter(Boolean))];

      if (franchiseeIds.length === 0) {
        return [];
      }

      // Get all companies for these franchisees with franchisee info
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select(`
          *,
          franchisee:franchisee_id (
            id,
            name
          )
        `)
        .in("franchisee_id", franchiseeIds)
        .eq("activo", true)
        .order("razon_social");

      if (companiesError) throw companiesError;

      // Group companies by franchisee
      const franchiseeMap = new Map<string, FranchiseeWithCompanies>();

      companies?.forEach((company: any) => {
        const franchiseeId = company.franchisee_id;
        const franchiseeName = company.franchisee?.name || "Sin Franquiciado";

        if (!franchiseeMap.has(franchiseeId)) {
          franchiseeMap.set(franchiseeId, {
            id: franchiseeId,
            name: franchiseeName,
            companies: [],
          });
        }

        franchiseeMap.get(franchiseeId)?.companies.push({
          id: company.id,
          razon_social: company.razon_social,
          cif: company.cif,
          tipo_sociedad: company.tipo_sociedad,
          franchisee_id: company.franchisee_id,
          activo: company.activo,
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
