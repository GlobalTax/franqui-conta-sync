import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAlerts = (filters?: {
  tipo?: string;
  centro?: string;
  activo?: boolean;
}) => {
  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("*, created_by_profile:profiles!alerts_created_by_fkey(*)")
        .order("created_at", { ascending: false });

      if (filters?.tipo) query = query.eq("tipo", filters.tipo);
      if (filters?.centro) query = query.eq("centro", filters.centro);
      if (filters?.activo !== undefined) query = query.eq("activo", filters.activo);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from("alerts")
        .insert({
          ...alertData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alerta creada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al crear la alerta: " + error.message);
    },
  });
};

export const useUpdateAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...alertData }: any) => {
      const { error } = await supabase
        .from("alerts")
        .update(alertData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alerta actualizada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar la alerta: " + error.message);
    },
  });
};

export const useDeleteAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alerts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alerta eliminada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al eliminar la alerta: " + error.message);
    },
  });
};

export const useToggleAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("alerts")
        .update({ activo })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (error: any) => {
      toast.error("Error al cambiar estado de la alerta: " + error.message);
    },
  });
};
