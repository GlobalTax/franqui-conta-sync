import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface AccountTemplate {
  id: string;
  code: string;
  name: string;
  account_type: string;
  level: number;
  pgc_version: string;
  parent_code: string | null;
  description: string | null;
  created_at: string;
}

export const useAccountTemplates = (pgcVersion: string = "PGC-PYMES") => {
  return useQuery({
    queryKey: ["account-templates", pgcVersion],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_templates")
        .select("*")
        .eq("pgc_version", pgcVersion)
        .order("code");

      if (error) throw error;
      return data as AccountTemplate[];
    },
  });
};

export const useLoadPGCTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      centroCode,
      companyId,
    }: {
      centroCode: string;
      companyId?: string;
    }) => {
      // Get all templates
      const { data: templates, error: templatesError } = await supabase
        .from("account_templates")
        .select("*")
        .eq("pgc_version", "PGC-PYMES");

      if (templatesError) throw templatesError;

      // Check if accounts already exist for this centro
      // Check if accounts already exist for this centro using a direct query
      const { count: existingCount, error: checkError } = await supabase
        .from("accounts" as any)
        .select("*", { count: "exact", head: true })
        .eq("centro_code", centroCode);

      if (checkError) throw checkError;

      if (existingCount && existingCount > 0) {
        throw new Error(
          "Ya existen cuentas para este centro. Elimine las cuentas existentes antes de cargar la plantilla."
        );
      }

      // Insert accounts from templates
      const accountsToInsert = templates.map((template) => ({
        code: template.code,
        name: template.name,
        account_type: template.account_type,
        level: template.level,
        parent_code: template.parent_code,
        description: template.description,
        centro_code: centroCode,
        company_id: companyId || null,
        active: true,
      }));

      const { error: insertError } = await supabase
        .from("accounts" as any)
        .insert(accountsToInsert);

      if (insertError) throw insertError;

      return accountsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: "Plantilla PGC cargada",
        description: `Se han creado ${count} cuentas desde la plantilla PGC-PYMES`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cargar plantilla",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
