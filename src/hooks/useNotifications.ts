import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

export const useNotifications = () => {
  const queryClient = useQueryClient();

  // Query inicial - solo 1 vez al cargar
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from("alert_notifications")
        .select("*")
        .eq("destinatario_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: true,  // Solo refetch al volver a la pestaña
    refetchInterval: false,       // ✅ NO polling automático (eliminamos 120 queries/hora)
  });

  // ✅ REALTIME: Suscripción a cambios en tiempo real
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      logger.info('useNotifications', 'Iniciando suscripcion Realtime para notificaciones...');

      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'alert_notifications',
            filter: `destinatario_user_id=eq.${user.id}`,
          },
          (payload) => {
            logger.debug('useNotifications', 'Nueva notificacion recibida:', payload.new);

            // Añadir notificación nueva al inicio del cache sin refetch
            queryClient.setQueryData(['notifications'], (old: any) => {
              return [payload.new, ...(old || [])];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'alert_notifications',
            filter: `destinatario_user_id=eq.${user.id}`,
          },
          (payload) => {
            logger.debug('useNotifications', 'Notificacion actualizada:', payload.new);

            // Actualizar notificación en el cache
            queryClient.setQueryData(['notifications'], (old: any) => {
              return old?.map((n: any) =>
                n.id === payload.new.id ? payload.new : n
              ) || [];
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('useNotifications', 'Suscripcion Realtime establecida');
          } else if (status === 'CLOSED') {
            logger.info('useNotifications', 'Suscripcion Realtime cerrada');
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('useNotifications', 'Error en canal Realtime');
          }
        });

      cleanup = () => {
        logger.debug('useNotifications', 'Limpiando suscripcion Realtime...');
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();

    return () => {
      cleanup?.();
    };
  }, [queryClient]);

  return query;
};

export const useUnreadCount = () => {
  const { data: notifications } = useNotifications();
  return notifications?.filter(n => !n.leida).length || 0;
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("alert_notifications")
        .update({
          leida: true,
          leida_at: new Date().toISOString(),
          leida_por: user.id,
        })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("alert_notifications")
        .update({
          leida: true,
          leida_at: new Date().toISOString(),
          leida_por: user.id,
        })
        .eq("destinatario_user_id", user.id)
        .eq("leida", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
