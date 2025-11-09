import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export const useFranchiseeDetail = (franchiseeId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query: Franchisee details
  const franchiseeQuery = useQuery({
    queryKey: ["franchisee-detail", franchiseeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franchisees")
        .select("*")
        .eq("id", franchiseeId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Query: Associated centres
  const centresQuery = useQuery({
    queryKey: ["franchisee-centres", franchiseeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .eq("franchisee_id", franchiseeId)
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
  });

  // Query: Associated companies
  const companiesQuery = useQuery({
    queryKey: ["franchisee-companies", franchiseeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("franchisee_id", franchiseeId)
        .eq("activo", true)
        .order("razon_social");
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation: Update franchisee data
  const updateFranchisee = useMutation({
    mutationFn: async (updates: any) => {
      logger.debug('useFranchiseeDetail', '🔄 Iniciando actualización...', { franchiseeId, updates });
      
      const { data, error } = await supabase
        .from("franchisees")
        .update(updates)
        .eq("id", franchiseeId)
        .select()
        .single();

      if (error) {
        logger.error('useFranchiseeDetail', '❌ Error de Supabase:', error.code, error.message);
        throw error;
      }
      
      logger.info('useFranchiseeDetail', '✅ Actualización exitosa:', data.id);
      return data;
    },
    onSuccess: (data) => {
      logger.info('useFranchiseeDetail', '✅ onSuccess ejecutado:', data.id);
      queryClient.invalidateQueries({ 
        queryKey: ["franchisee-detail", franchiseeId],
        exact: true 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["franchisees"],
        exact: true 
      });
      // Invalidar también companies por si cambió alguna relación
      queryClient.invalidateQueries({ 
        queryKey: ["company-detail"] 
      });
      toast({
        title: "Franquiciado actualizado",
        description: "Los datos se han guardado correctamente",
      });
    },
    onError: (error: any) => {
      logger.error('useFranchiseeDetail', '❌ onError ejecutado:', error.code, error.message);
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo guardar los cambios. Verifica la consola para más detalles.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Associate centre
  const associateCentre = useMutation({
    mutationFn: async (centreId: string) => {
      const { data, error } = await supabase
        .from("centres")
        .update({ franchisee_id: franchiseeId })
        .eq("id", centreId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisee-centres", franchiseeId] });
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      toast({
        title: "Centro asociado",
        description: "El centro se ha asociado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Dissociate centre
  const dissociateCentre = useMutation({
    mutationFn: async (centreId: string) => {
      const { data, error } = await supabase
        .from("centres")
        .update({ franchisee_id: null })
        .eq("id", centreId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisee-centres", franchiseeId] });
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      toast({
        title: "Centro desasociado",
        description: "El centro se ha desasociado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Create company
  const createCompany = useMutation({
    mutationFn: async (companyData: { razon_social: string; cif: string; tipo_sociedad: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          ...companyData,
          franchisee_id: franchiseeId,
          activo: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisee-companies", franchiseeId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["available-companies"] });
      toast({
        title: "Sociedad creada",
        description: "La sociedad se ha creado y asociado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear sociedad",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Associate company
  const associateCompany = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase
        .from("companies")
        .update({ franchisee_id: franchiseeId })
        .eq("id", companyId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisee-companies", franchiseeId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["available-companies"] });
      toast({
        title: "Sociedad asociada",
        description: "La sociedad se ha asociado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Dissociate company
  const dissociateCompany = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase
        .from("companies")
        .update({ franchisee_id: null })
        .eq("id", companyId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisee-companies", franchiseeId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["available-companies"] });
      toast({
        title: "Sociedad desasociada",
        description: "La sociedad se ha desasociado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Delete franchisee
  const deleteFranchisee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("franchisees")
        .delete()
        .eq("id", franchiseeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisees"] });
      toast({
        title: "Franquiciado eliminado",
        description: "El franquiciado se ha eliminado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    franchisee: franchiseeQuery.data,
    centres: centresQuery.data || [],
    companies: companiesQuery.data || [],
    isLoading: franchiseeQuery.isLoading || centresQuery.isLoading || companiesQuery.isLoading,
    updateFranchisee,
    associateCentre,
    dissociateCentre,
    createCompany,
    associateCompany,
    dissociateCompany,
    deleteFranchisee,
  };
};
