import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SaltEdgeMetrics {
  activeConnections: number;
  expiringConnections: number;
  todayTransactions: number;
  recentErrors: number;
  connectedAccounts: number;
  transactionsByDay: Array<{ started_at: string; transactions_synced: number }>;
  errorDetails: Array<{
    id: string;
    started_at: string;
    sync_type: string;
    error_message: string | null;
  }>;
}

export function useSaltEdgeMetrics(centroCode?: string) {
  return useQuery({
    queryKey: ['salt-edge-metrics', centroCode],
    queryFn: async (): Promise<SaltEdgeMetrics> => {
      // 1. Conexiones activas
      const connectionsQueryBuilder = supabase
        .from('salt_edge_connections' as any)
        .select('status, consent_expires_at');
      
      const connectionsQuery = centroCode 
        ? connectionsQueryBuilder.eq('centro_code', centroCode)
        : connectionsQueryBuilder;

      // 2. Transacciones importadas hoy
      const today = new Date().toISOString().split('T')[0];
      const todayTransactionsQuery = supabase
        .from('bank_transactions' as any)
        .select('id, created_at', { count: 'exact', head: false })
        .gte('created_at', today)
        .not('import_batch_id', 'is', null);

      // 3. Errores recientes (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const errorsQuery = supabase
        .from('salt_edge_sync_log' as any)
        .select('id, started_at, sync_type, error_message')
        .eq('status', 'error')
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: false })
        .limit(5);

      // 4. Cuentas bancarias conectadas
      const accountsQuery = supabase
        .from('bank_accounts' as any)
        .select('id', { count: 'exact', head: true })
        .eq('active', true);

      // 5. Transacciones por día (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transactionsByDayQuery = supabase
        .from('salt_edge_sync_log' as any)
        .select('started_at, transactions_synced')
        .eq('status', 'success')
        .gte('started_at', thirtyDaysAgo.toISOString())
        .order('started_at', { ascending: true });

      // Ejecutar todas las queries en paralelo
      const [
        { data: connections },
        { data: todayTrans, count: todayCount },
        { data: errors, count: errorCount },
        { count: accountsCount },
        { data: transactionsByDay },
      ] = await Promise.all([
        connectionsQuery,
        todayTransactionsQuery,
        errorsQuery,
        accountsQuery,
        transactionsByDayQuery,
      ]);

      // Calcular métricas con tipado seguro
      const activeConnections = (connections as any[] || []).filter((c: any) => c.status === 'active').length;
      
      const expiringConnections = (connections as any[] || []).filter((c: any) => {
        if (!c.consent_expires_at) return false;
        const expiryDate = new Date(c.consent_expires_at);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }).length;

      return {
        activeConnections,
        expiringConnections,
        todayTransactions: todayCount || 0,
        recentErrors: errorCount || 0,
        connectedAccounts: accountsCount || 0,
        transactionsByDay: (transactionsByDay as any[] || []),
        errorDetails: (errors as any[] || []),
      };
    },
  });
}
