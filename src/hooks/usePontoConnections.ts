import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PontoConnection {
  id: string;
  centro_code: string;
  institution_id: string;
  institution_name: string | null;
  status: string;
  token_expires_at: string;
  access_token_enc: string;
  refresh_token_enc: string;
  consent_reference: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export const usePontoConnections = (centroCode?: string) => {
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["ponto-connections", centroCode],
    queryFn: async () => {
      let query = supabase
        .from("ponto_connections")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (centroCode) {
        query = query.eq("centro_code", centroCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PontoConnection[];
    },
  });

  const deleteConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("ponto_connections")
        .update({ status: "inactive" })
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ponto-connections"] });
      toast.success("Conexión Ponto eliminada");
    },
    onError: (error) => {
      toast.error("Error al eliminar conexión Ponto");
      console.error(error);
    },
  });

  return {
    connections: connections || [],
    isLoading,
    deleteConnection: deleteConnection.mutate,
  };
};
