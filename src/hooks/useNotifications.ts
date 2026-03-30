import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

// ── Singleton Realtime channel management ──
const activeChannels = new Map<string, { channel: ReturnType<typeof supabase.channel>; refCount: number }>();

function ensureRealtimeChannel(userId: string, queryClient: ReturnType<typeof useQueryClient>) {
  const existing = activeChannels.get(userId);
  if (existing) {
    existing.refCount++;
    logger.debug('useNotifications', `Canal reutilizado para ${userId}, refCount=${existing.refCount}`);
    return;
  }

  const channelName = `notif-${userId}-${Date.now()}`;
  logger.info('useNotifications', `Creando canal singleton ${channelName}`);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alert_notifications',
        filter: `destinatario_user_id=eq.${userId}`,
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
        filter: `destinatario_user_id=eq.${userId}`,
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
      }
    });

  activeChannels.set(userId, { channel, refCount: 1 });
}

function releaseRealtimeChannel(userId: string) {
  const entry = activeChannels.get(userId);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    logger.debug('useNotifications', `Eliminando canal singleton para ${userId}`);
    supabase.removeChannel(entry.channel);
    activeChannels.delete(userId);
  } else {
    logger.debug('useNotifications', `Release canal ${userId}, refCount=${entry.refCount}`);
  }
}

/**
 * Hook principal de notificaciones — singleton Realtime.
 * Seguro para llamar desde múltiples componentes simultáneamente.
 */
export const useNotifications = () => {
  const queryClient = useQueryClient();

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

  useEffect(() => {
    let userId: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      ensureRealtimeChannel(userId, queryClient);
    };

    setup();

    return () => {
      if (userId) {
        releaseRealtimeChannel(userId);
      }
    };
  }, [queryClient]);

  const unreadCount = useMemo(() => {
    return query.data?.filter((n) => !n.leida).length || 0;
  }, [query.data]);

  return {
    ...query,
    unreadCount,
  };
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
