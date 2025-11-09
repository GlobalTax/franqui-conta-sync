import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      const { data, error } = await supabase
        .from("franchisees")
        .update(updates)
        .eq("id", franchiseeId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisee-detail", franchiseeId] });
      queryClient.invalidateQueries({ queryKey: ["franchisees"] });
      toast({
        title: "Franquiciado actualizado",
        description: "Los datos se han guardado correctamente",
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
    associateCompany,
    dissociateCompany,
    deleteFranchisee,
  };
};
