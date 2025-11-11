import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SaltEdgeConnection {
  id: string;
  centro_code: string;
  connection_id: string;
  provider_code: string;
  provider_name: string;
  customer_id: string | null;
  status: 'active' | 'inactive' | 'disabled' | 'reconnect_required';
  consent_expires_at: string | null;
  last_sync_at: string | null;
  last_success_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SaltEdgeSyncLog {
  id: string;
  connection_id: string;
  sync_type: 'accounts' | 'transactions' | 'webhook' | 'manual';
  status: 'success' | 'error' | 'partial';
  records_synced: number;
  accounts_synced: number;
  transactions_synced: number;
  error_message: string | null;
  details: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export function useSaltEdgeConnections(centroCode?: string) {
  return useQuery({
    queryKey: ['salt-edge-connections', centroCode],
    queryFn: async () => {
      let query = supabase
        .from('salt_edge_connections' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (centroCode) {
        query = query.eq('centro_code', centroCode);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as any) as SaltEdgeConnection[];
    },
  });
}

export function useSaltEdgeSyncLogs(connectionId?: string) {
  return useQuery({
    queryKey: ['salt-edge-sync-logs', connectionId],
    queryFn: async () => {
      let query = supabase
        .from('salt_edge_sync_log' as any)
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as any) as SaltEdgeSyncLog[];
    },
  });
}

export function useCreateBankConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      centroCode,
      providerCode,
      returnUrl,
    }: {
      centroCode: string;
      providerCode: string;
      returnUrl?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-bank-connection', {
        body: { centroCode, providerCode, returnUrl },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salt-edge-connections'] });
      
      if (data.connectUrl) {
        // Open Salt Edge widget in a popup
        const width = 600;
        const height = 800;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
          data.connectUrl,
          'SaltEdgeConnect',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        
        toast.success('Conexión bancaria iniciada');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear conexión bancaria');
    },
  });
}

export function useSyncBankTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      centroCode,
    }: {
      connectionId?: string;
      centroCode?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-bank-transactions', {
        body: { connectionId, centroCode },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salt-edge-connections'] });
      queryClient.invalidateQueries({ queryKey: ['salt-edge-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      
      toast.success(
        `Sincronización completada: ${data.transactionsSynced} transacciones, ${data.accountsSynced} cuentas`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al sincronizar transacciones');
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salt_edge_connections' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salt-edge-connections'] });
      toast.success('Conexión eliminada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar conexión');
    },
  });
}
