import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

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
      logger.debug('useCreateFranchisee', '🔄 Iniciando creación...', franchiseeData);
      
      const { data, error } = await supabase
        .from("franchisees")
        .insert(franchiseeData)
        .select()
        .single();
      
      if (error) {
        logger.error('useCreateFranchisee', '❌ Error al crear:', error.code, error.message);
        throw error;
      }
      
      logger.info('useCreateFranchisee', '✅ Franchisee creado:', data.id);
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
      logger.error('useCreateFranchisee', '❌ Error en onError:', error.code, error.message);
      
      let description = error.message || "No se pudo crear el franchisee";
      if (error.code === "23505") {
        description = "Ya existe un franchisee con ese email o CIF";
      } else if (error.code === "PGRST301" || error.message?.includes("permission")) {
        description = "No tienes permisos para crear franchisees";
      }
      
      toast({
        title: "Error al crear",
        description,
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
      logger.debug('useUpdateFranchisee', '🔄 Iniciando actualización...', { id, ...franchiseeData });
      
      const { data, error } = await supabase
        .from("franchisees")
        .update(franchiseeData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        logger.error('useUpdateFranchisee', '❌ Error al actualizar:', error.code, error.message);
        throw error;
      }
      
      logger.info('useUpdateFranchisee', '✅ Franchisee actualizado:', data.id);
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
      logger.error('useUpdateFranchisee', '❌ Error en onError:', error.code, error.message);
      
      let description = error.message || "No se pudo actualizar el franchisee";
      if (error.code === "23505") {
        description = "Ya existe un franchisee con ese email o CIF";
      } else if (error.code === "PGRST301" || error.message?.includes("permission")) {
        description = "No tienes permisos para actualizar franchisees";
      }
      
      toast({
        title: "Error al actualizar",
        description,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteFranchisee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (franchiseeId: string) => {
      logger.debug('useDeleteFranchisee', '🔄 Iniciando eliminación...', franchiseeId);
      
      const { error } = await supabase
        .from("franchisees")
        .delete()
        .eq("id", franchiseeId);
      
      if (error) {
        logger.error('useDeleteFranchisee', '❌ Error al eliminar:', error.code, error.message);
        throw error;
      }
      
      logger.info('useDeleteFranchisee', '✅ Franchisee eliminado');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisees"] });
      queryClient.invalidateQueries({ queryKey: ["franchisee-detail"] });
      toast({
        title: "Franchisee eliminado",
        description: "El franchisee ha sido eliminado exitosamente",
      });
    },
    onError: (error: any) => {
      logger.error('useDeleteFranchisee', '❌ Error en onError:', error.code, error.message);
      
      let description = error.message || "No se pudo eliminar el franchisee";
      if (error.code === "23503") {
        description = "No se puede eliminar: el franchisee tiene centros o sociedades asociadas";
      } else if (error.code === "PGRST301" || error.message?.includes("permission")) {
        description = "No tienes permisos para eliminar franchisees";
      }
      
      toast({
        title: "Error al eliminar",
        description,
        variant: "destructive",
      });
    },
  });
};
