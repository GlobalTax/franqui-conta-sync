import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCentres = () => {
  return useQuery({
    queryKey: ["centres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("*, centre_companies(*)")
        .order("nombre");
      
      if (error) throw error;
      
      // Load franchisees separately
      const franchiseeIds = Array.from(new Set(data.map(c => c.franchisee_id).filter(Boolean)));
      const { data: franchisees } = await supabase
        .from("franchisees")
        .select("id, name, email")
        .in("id", franchiseeIds);
      
      const franchiseesMap = new Map((franchisees || []).map(f => [f.id, f]));
      
      return data.map(c => ({
        ...c,
        franchisees: c.franchisee_id ? franchiseesMap.get(c.franchisee_id) : null
      }));
    },
  });
};

export const useCentre = (id: string) => {
  return useQuery({
    queryKey: ["centres", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("*, centre_companies(*)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Load franchisee
      let franchisee = null;
      if (data.franchisee_id) {
        const { data: franchiseeData } = await supabase
          .from("franchisees")
          .select("*")
          .eq("id", data.franchisee_id)
          .single();
        
        franchisee = franchiseeData;
      }
      
      // Load orquest service
      let orquestService = null;
      if (data.orquest_service_id) {
        const { data: serviceData } = await supabase
          .from("orquest_services")
          .select("*")
          .eq("id", data.orquest_service_id)
          .single();
        
        orquestService = serviceData;
      }
      
      return {
        ...data,
        franchisees: franchisee,
        orquest_service: orquestService
      };
    },
    enabled: !!id,
  });
};

export const useCreateCentre = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (centreData: any) => {
      const { data, error } = await supabase
        .from("centres")
        .insert(centreData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      toast({
        title: "Centro creado",
        description: "El centro ha sido creado exitosamente",
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
};

export const useUpdateCentre = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...centreData }: any) => {
      const { data, error } = await supabase
        .from("centres")
        .update(centreData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      toast({
        title: "Centro actualizado",
        description: "El centro ha sido actualizado exitosamente",
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
};
