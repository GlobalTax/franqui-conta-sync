// ============================================================================
// HOOK: Compliance Metrics
// Métricas agregadas para dashboard de cumplimiento normativo
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useView } from '@/contexts/ViewContext';

interface ComplianceMetrics {
  totalEntries: number;
  lockedEntries: number;
  unresolvedIncidents: number;
  lastValidationDate: string | null;
  chainStatus: 'valid' | 'broken' | 'unknown';
  closedPeriods: number;
  openPeriods: number;
}

export function useComplianceMetrics() {
  const { selectedView } = useView();

  return useQuery({
    queryKey: ['compliance-metrics', selectedView?.id],
    queryFn: async (): Promise<ComplianceMetrics> => {
      const centroCode = selectedView?.type === 'centre' ? selectedView.id : null;

      // Total entries
      let entriesQuery = supabase
        .from('accounting_entries')
        .select('id, status', { count: 'exact', head: true });

      if (centroCode) {
        entriesQuery = entriesQuery.eq('centro_code', centroCode);
      }

      const { count: totalEntries } = await entriesQuery;

      // Locked entries (posted or closed)
      let lockedQuery = supabase
        .from('accounting_entries')
        .select('id', { count: 'exact', head: true })
        .in('status', ['posted', 'closed']);

      if (centroCode) {
        lockedQuery = lockedQuery.eq('centro_code', centroCode);
      }

      const { count: lockedEntries } = await lockedQuery;

      // Unresolved incidents
      const { count: unresolvedIncidents } = await supabase
        .from('accounting_incident_log' as any)
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false);

      // Closing periods
      const { data: periods } = await supabase.rpc('get_closing_periods' as any, {
        p_centro_code: centroCode,
        p_year: null,
      });

      const closedPeriods = periods?.filter((p: any) => p.status === 'closed').length || 0;
      const openPeriods = periods?.filter((p: any) => p.status === 'open').length || 0;

      return {
        totalEntries: totalEntries || 0,
        lockedEntries: lockedEntries || 0,
        unresolvedIncidents: unresolvedIncidents || 0,
        lastValidationDate: null,
        chainStatus: 'unknown',
        closedPeriods,
        openPeriods,
      };
    },
    enabled: !!selectedView,
  });
}
