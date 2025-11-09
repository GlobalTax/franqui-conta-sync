import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CompanyFiscalConfig {
  id: string;
  company_id: string;
  iva_regime: "general" | "recargo_equivalencia" | "exento" | "simplificado";
  default_iva_rate: number;
  irpf_retention_rate: number;
  invoice_series: string;
  accounting_method: "devengo" | "caja";
  fiscal_year_start_month: number;
  use_verifactu: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompanyFiscalConfig(companyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["company-fiscal-config", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("company_fiscal_config" as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) throw error;
      return (data || null) as unknown as CompanyFiscalConfig | null;
    },
    enabled: !!companyId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (configData: Partial<CompanyFiscalConfig>) => {
      if (!companyId) throw new Error("Company ID is required");

      const payload = {
        company_id: companyId,
        ...configData,
      };

      const { data, error } = await supabase
        .from("company_fiscal_config" as any)
        .upsert(payload, { onConflict: "company_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-fiscal-config", companyId] });
      toast({
        title: "Configuración guardada",
        description: "La configuración fiscal se ha actualizado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    },
  });

  return {
    config,
    isLoading,
    error,
    updateConfig: upsertMutation.mutate,
    isUpdating: upsertMutation.isPending,
  };
}
