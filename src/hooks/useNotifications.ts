import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

/**
 * Hook principal de notificaciones.
 * Devuelve notifications, unreadCount, isLoading y mutations.
 * Una sola suscripción Realtime por instancia — no duplica canales.
 */
export const useNotifications = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  // Suscripción Realtime — una sola vez, limpieza correcta
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Limpiar canal anterior si existe
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channelName = `notif-${user.id}`;
      logger.info('useNotifications', `Suscribiendo canal ${channelName}`);

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'alert_notifications',
            filter: `destinatario_user_id=eq.${user.id}`,
          },
          (payload) => {
            logger.debug('useNotifications', 'Nueva notificacion:', payload.new);
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
            queryClient.setQueryData(['notifications'], (old: any) => {
              return old?.map((n: any) =>
                n.id === payload.new.id ? payload.new : n
              ) || [];
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            logger.info('useNotifications', `Canal ${channelName} activo`);
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('useNotifications', `Error canal ${channelName}`, err);
          } else if (status === 'CLOSED') {
            logger.debug('useNotifications', `Canal ${channelName} cerrado`);
          }
        });

      channelRef.current = channel;
    };

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        logger.debug('useNotifications', 'Cleanup: removiendo canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);

  // Derivar unreadCount del cache sin crear otra suscripción
  const unreadCount = useMemo(() => {
    return query.data?.filter((n) => !n.leida).length || 0;
  }, [query.data]);

  return {
    ...query,
    unreadCount,
  };
};

/**
 * @deprecated Usar useNotifications().unreadCount en su lugar
 */
export const useUnreadCount = () => {
  const { unreadCount } = useNotifications();
  return unreadCount;
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
