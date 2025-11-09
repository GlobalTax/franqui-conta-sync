import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CompanyDetailData {
  id: string;
  cif: string;
  razon_social: string;
  tipo_sociedad: string;
  franchisee_id: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  code?: string;
  legal_type?: string;
  nif_prefix?: string;
  nif_number?: string;
  country_fiscal_code?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  phone4?: string;
  contact_name?: string;
  email?: string;
  address_fiscal_id?: string;
  address_social_id?: string;
  pgc_verified?: boolean;
  franchisee?: {
    id: string;
    name: string;
    email: string;
    company_tax_id: string;
  };
  fiscal_address?: any;
  social_address?: any;
}

export interface AssociatedCentre {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  activo: boolean;
  es_principal: boolean;
  source: 'centre_companies' | 'company_id';
  centre_company_id?: string;
}

export function useCompanyDetail(companyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ["company-detail", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          franchisees:franchisee_id (
            id,
            name,
            email,
            company_tax_id
          ),
          fiscal_address:address_fiscal_id (
            *
          ),
          social_address:address_social_id (
            *
          )
        `)
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data as CompanyDetailData;
    },
    enabled: !!companyId,
  });

  const { data: associatedCentres, isLoading: isLoadingCentres } = useQuery({
    queryKey: ["company-centres", companyId, company?.cif],
    queryFn: async () => {
      console.log("🔍 Fetching centres for company:", {
        companyId,
        cif: company?.cif,
        companyLoaded: !!company
      });

      if (!companyId) {
        console.warn("⚠️ Missing companyId, skipping centres query");
        return [];
      }

      const companyCif = company?.cif;
      if (!companyCif) {
        console.warn("⚠️ Missing company CIF, skipping centres query");
        return [];
      }

      try {
        // Get centres from centre_companies
        const { data: centreCompaniesData, error: ccError } = await supabase
          .from("centre_companies")
          .select(`
            id,
            es_principal,
            centres:centre_id (
              id,
              codigo,
              nombre,
              direccion,
              ciudad,
              activo
            )
          `)
          .eq("cif", companyCif)
          .eq("activo", true);

        if (ccError) {
          console.error("❌ Error fetching centre_companies:", ccError);
          throw ccError;
        }

        // Get centres from centres.company_id
        const { data: directCentres, error: dcError } = await supabase
          .from("centres")
          .select("*")
          .eq("company_id", companyId)
          .eq("activo", true);

        if (dcError) {
          console.error("❌ Error fetching direct centres:", dcError);
          throw dcError;
        }

        // Merge results
        const centresFromCC: AssociatedCentre[] = (centreCompaniesData || [])
          .filter(cc => cc.centres)
          .map(cc => ({
            id: cc.centres.id,
            codigo: cc.centres.codigo,
            nombre: cc.centres.nombre,
            direccion: cc.centres.direccion,
            ciudad: cc.centres.ciudad,
            activo: cc.centres.activo,
            es_principal: cc.es_principal,
            source: 'centre_companies' as const,
            centre_company_id: cc.id,
          }));

        const centresFromDirect: AssociatedCentre[] = (directCentres || [])
          .filter(c => !centresFromCC.some(cc => cc.id === c.id))
          .map(c => ({
            id: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            direccion: c.direccion,
            ciudad: c.ciudad,
            activo: c.activo,
            es_principal: false,
            source: 'company_id' as const,
          }));

        console.log("✅ Centres fetched successfully:", {
          fromCentreCompanies: centresFromCC.length,
          fromDirect: centresFromDirect.length,
          total: centresFromCC.length + centresFromDirect.length
        });

        return [...centresFromCC, ...centresFromDirect];
      } catch (error: any) {
        console.error("❌ Error fetching centres:", {
          error,
          code: error?.code,
          message: error?.message,
          cif: companyCif
        });
        throw error;
      }
    },
    enabled: !!companyId && !!company?.cif && company.cif !== "",
    retry: (failureCount, error: any) => {
      // No reintentar si es error 400 (datos inválidos)
      if (error?.code === 'PGRST116' || error?.status === 400) {
        console.warn("⚠️ Not retrying 400 error for centres query");
        return false;
      }
      return failureCount < 3;
    },
  });

  const updateCompany = useMutation({
    mutationFn: async (data: Partial<CompanyDetailData>) => {
      if (!companyId) throw new Error("Company ID is required");

      const { error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-detail", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({
        title: "Éxito",
        description: "Sociedad actualizada correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la sociedad",
        variant: "destructive",
      });
    },
  });

  const dissociateCentre = useMutation({
    mutationFn: async (centreId: string) => {
      const centre = associatedCentres?.find(c => c.id === centreId);
      if (!centre) throw new Error("Centre not found");

      if (centre.source === 'centre_companies' && centre.centre_company_id) {
        const { error } = await supabase
          .from("centre_companies")
          .update({ activo: false })
          .eq("id", centre.centre_company_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("centres")
          .update({ company_id: null })
          .eq("id", centreId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-centres", companyId] });
      toast({
        title: "Éxito",
        description: "Centro desasociado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo desasociar el centro",
        variant: "destructive",
      });
    },
  });

  const setPrincipalCentre = useMutation({
    mutationFn: async (centreId: string) => {
      const centre = associatedCentres?.find(c => c.id === centreId);
      if (!centre) throw new Error("Centre not found");

      if (centre.source === 'centre_companies' && centre.centre_company_id) {
        // First, unmark all others
        await supabase
          .from("centre_companies")
          .update({ es_principal: false })
          .eq("cif", company?.cif || "");

        // Then mark this one
        const { error } = await supabase
          .from("centre_companies")
          .update({ es_principal: true })
          .eq("id", centre.centre_company_id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-centres", companyId] });
      toast({
        title: "Éxito",
        description: "Centro principal actualizado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el centro principal",
        variant: "destructive",
      });
    },
  });

  const stats = {
    totalCentres: associatedCentres?.length || 0,
    activeCentres: associatedCentres?.filter(c => c.activo).length || 0,
    principalCentres: associatedCentres?.filter(c => c.es_principal).length || 0,
  };

  return {
    company,
    associatedCentres: associatedCentres || [],
    stats,
    isLoading: isLoadingCompany || isLoadingCentres,
    updateCompany: updateCompany.mutate,
    isUpdating: updateCompany.isPending,
    dissociateCentre: dissociateCentre.mutate,
    isDissociating: dissociateCentre.isPending,
    setPrincipalCentre: setPrincipalCentre.mutate,
    isSettingPrincipal: setPrincipalCentre.isPending,
  };
}
