import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useOrquestServices = () => {
  return useQuery({
    queryKey: ["orquest-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orquest_services")
        .select("*")
        .order("nombre");
      
      if (error) throw error;
      return data;
    },
  });
};

export const useSyncOrquestServices = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-orquest-services');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orquest-services"] });
      toast({
        title: "Sincronización completada",
        description: `Se sincronizaron ${data.total_services} servicios de Orquest`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en sincronización",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useLinkCentreToService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ centreId, serviceId }: { centreId: string; serviceId: string | null }) => {
      const { error } = await supabase
        .from("centres")
        .update({ orquest_service_id: serviceId })
        .eq("id", centreId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      toast({
        title: "Vinculación actualizada",
        description: "El servicio de Orquest ha sido vinculado al centro",
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

export const useOrquestSyncLogs = () => {
  return useQuery({
    queryKey: ["orquest-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orquest_services_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });
};
