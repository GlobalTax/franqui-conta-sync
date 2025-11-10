import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (companyData: {
      razon_social: string;
      cif: string;
      tipo_sociedad: string;
      franchisee_id: string;
    }) => {
      logger.debug('useCreateCompany', '🔄 Iniciando creación...', companyData);
      
      const { data, error } = await supabase
        .from("companies")
        .insert({
          ...companyData,
          activo: true
        })
        .select()
        .single();
      
      if (error) {
        logger.error('useCreateCompany', '❌ Error al crear:', error.code, error.message);
        throw error;
      }
      
      logger.info('useCreateCompany', '✅ Company creada:', data.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error: any) => {
      logger.error('useCreateCompany', '❌ Error en onError:', error.code, error.message);
      
      let description = error.message || "No se pudo crear la sociedad";
      if (error.code === "23505") {
        description = "Ya existe una sociedad con ese CIF";
      } else if (error.code === "PGRST301" || error.message?.includes("permission")) {
        description = "No tienes permisos para crear sociedades";
      }
      
      toast({
        title: "Error al crear sociedad",
        description,
        variant: "destructive",
      });
    },
  });
};
