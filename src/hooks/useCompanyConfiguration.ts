import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CompanyWithAddresses {
  id: string;
  code: string | null;
  razon_social: string;
  cif: string;
  legal_type: string | null;
  nif_prefix: string | null;
  nif_number: string | null;
  country_fiscal_code: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  phone4: string | null;
  contact_name: string | null;
  email: string | null;
  pgc_verified: boolean | null;
  fiscal_address?: any;
  social_address?: any;
}

export function useCompanyConfiguration(companyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["company-configuration", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data: company, error: companyError } = await supabase
        .from("companies" as any)
        .select("*")
        .eq("id", companyId)
        .single();

      if (companyError) throw companyError;

      let fiscalAddress = null;
      let socialAddress = null;

      const companyAny = company as any;

      if (companyAny.address_fiscal_id) {
        const { data: fiscal } = await supabase
          .from("addresses" as any)
          .select("*")
          .eq("id", companyAny.address_fiscal_id)
          .single();
        fiscalAddress = fiscal;
      }

      if (companyAny.address_social_id) {
        const { data: social } = await supabase
          .from("addresses" as any)
          .select("*")
          .eq("id", companyAny.address_social_id)
          .single();
        socialAddress = social;
      }

      return {
        ...companyAny,
        fiscal_address: fiscalAddress,
        social_address: socialAddress,
      } as CompanyWithAddresses;
    },
    enabled: !!companyId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      companyData,
      fiscalAddress,
      socialAddress,
    }: {
      companyData: Partial<CompanyWithAddresses>;
      fiscalAddress?: any;
      socialAddress?: any;
    }) => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase.rpc(
        "upsert_company_with_addresses" as any,
        {
          p_company_id: companyId,
          p_company_data: companyData,
          p_fiscal_address: fiscalAddress || null,
          p_social_address: socialAddress || null,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-configuration", companyId] });
      toast({
        title: "Cambios guardados",
        description: "La configuración de la empresa se ha actualizado correctamente",
      });
    },
    onError: (error: any) => {
      console.error("Error updating company:", error);
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    },
  });

  return {
    company: data,
    isLoading,
    error,
    updateCompany: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export interface LocationResult {
  type: string;
  id: string;
  code: string;
  name: string;
  parent_name: string;
  country_code: string;
}

export function useLocationSearch(query: string, enabled = true) {
  return useQuery<LocationResult[]>({
    queryKey: ["location-search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase.rpc("search_locations" as any, {
        search_query: query,
        limit_results: 10,
      });

      if (error) throw error;
      return (data || []) as LocationResult[];
    },
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
