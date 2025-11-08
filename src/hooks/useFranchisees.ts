import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFranchisees = () => {
  return useQuery({
    queryKey: ["franchisees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franchisees")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateFranchisee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (franchiseeData: any) => {
      const { data, error } = await supabase
        .from("franchisees")
        .insert(franchiseeData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisees"] });
      toast({
        title: "Franchisee creado",
        description: "El franchisee ha sido creado exitosamente",
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

export const useUpdateFranchisee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...franchiseeData }: any) => {
      const { data, error } = await supabase
        .from("franchisees")
        .update(franchiseeData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisees"] });
      toast({
        title: "Franchisee actualizado",
        description: "El franchisee ha sido actualizado exitosamente",
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
