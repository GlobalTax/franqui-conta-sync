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
      console.log("🔄 useCreateFranchisee - Iniciando creación...");
      console.log("📊 Datos a insertar:", franchiseeData);
      
      const { data, error } = await supabase
        .from("franchisees")
        .insert(franchiseeData)
        .select()
        .single();
      
      console.log("📡 Respuesta de Supabase:", { data, error });
      
      if (error) {
        console.error("❌ Error al crear franchisee:", error);
        console.error("❌ Error code:", error.code);
        console.error("❌ Error details:", error.details);
        console.error("❌ Error hint:", error.hint);
        throw error;
      }
      
      console.log("✅ Franchisee creado exitosamente:", data);
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
      console.error("❌ onError ejecutado:", error);
      
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
      console.log("🔄 useUpdateFranchisee - Iniciando actualización...");
      console.log("📊 Datos a actualizar:", franchiseeData);
      console.log("🆔 Franchisee ID:", id);
      
      const { data, error } = await supabase
        .from("franchisees")
        .update(franchiseeData)
        .eq("id", id)
        .select()
        .single();
      
      console.log("📡 Respuesta de Supabase:", { data, error });
      
      if (error) {
        console.error("❌ Error al actualizar franchisee:", error);
        console.error("❌ Error code:", error.code);
        console.error("❌ Error details:", error.details);
        console.error("❌ Error hint:", error.hint);
        throw error;
      }
      
      console.log("✅ Franchisee actualizado exitosamente:", data);
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
      console.error("❌ onError ejecutado:", error);
      
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
      console.log("🔄 useDeleteFranchisee - Iniciando eliminación...");
      console.log("🆔 Franchisee ID:", franchiseeId);
      
      const { error } = await supabase
        .from("franchisees")
        .delete()
        .eq("id", franchiseeId);
      
      if (error) {
        console.error("❌ Error al eliminar franchisee:", error);
        throw error;
      }
      
      console.log("✅ Franchisee eliminado exitosamente");
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
      console.error("❌ onError ejecutado:", error);
      
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
