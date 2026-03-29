import { useEffect, useRef } from 'react';
import { useView, ViewSelection } from '@/contexts/ViewContext';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import { useAllUserCentres } from '@/hooks/useAllUserCentres';

/**
 * Synchronizes ViewContext (sidebar CentreSelector) with useGlobalFilters (top bar CompactOrgSelector).
 * Simplified to 2 hierarchy levels: franchisee (consolidated) > centre
 */
export function useSyncViewAndFilters() {
  const { selectedView, setSelectedView } = useView();
  const { selectedCentreCode, selectedFranchiseeId, setFilters } = useGlobalFilters();
  const { data: franchiseesWithCentres } = useAllUserCentres();

  const syncSourceRef = useRef<'view' | 'filters' | null>(null);
  const lastSyncedView = useRef<string | null>(null);
  const lastSyncedFilters = useRef<string | null>(null);

  // Sync ViewContext → GlobalFilters
  useEffect(() => {
    if (syncSourceRef.current === 'filters') {
      syncSourceRef.current = null;
      return;
    }

    if (!selectedView) return;
    if (!franchiseesWithCentres) return;

    const viewKey = `${selectedView.type}:${selectedView.id}:${selectedView.code || ''}`;
    if (viewKey === lastSyncedView.current) return;

    lastSyncedView.current = viewKey;
    syncSourceRef.current = 'view';

    if (selectedView.type === 'centre') {
      let franchiseeId: string | null = null;
      for (const f of franchiseesWithCentres) {
        if (f.centres.find(c => c.id === selectedView.id || c.codigo === selectedView.code)) {
          franchiseeId = f.id;
          break;
        }
      }

      const filtersKey = `${franchiseeId}:${selectedView.code}`;
      lastSyncedFilters.current = filtersKey;

      setFilters({
        franchiseeId,
        centreCode: selectedView.code || null,
      });
    } else {
      // 'all' view — franchisee-level consolidated
      const filtersKey = `${selectedView.id || ''}:`;
      lastSyncedFilters.current = filtersKey;

      setFilters({
        franchiseeId: selectedView.id || null,
        centreCode: null,
      });
    }
  }, [selectedView, franchiseesWithCentres, setFilters]);

  // Sync GlobalFilters → ViewContext
  useEffect(() => {
    if (syncSourceRef.current === 'view') {
      syncSourceRef.current = null;
      return;
    }

    if (!franchiseesWithCentres) return;

    const filtersKey = `${selectedFranchiseeId || ''}:${selectedCentreCode || ''}`;
    if (filtersKey === lastSyncedFilters.current) return;

    lastSyncedFilters.current = filtersKey;
    syncSourceRef.current = 'filters';

    if (selectedCentreCode) {
      for (const f of franchiseesWithCentres) {
        const centre = f.centres.find(c => c.codigo === selectedCentreCode);
        if (centre) {
          const newView: ViewSelection = {
            type: 'centre',
            id: centre.id,
            code: centre.codigo,
            name: `${centre.codigo} - ${centre.nombre}`,
          };
          lastSyncedView.current = `centre:${centre.id}:${centre.codigo}`;
          setSelectedView(newView);
          return;
        }
      }
    } else if (selectedFranchiseeId) {
      const franchisee = franchiseesWithCentres.find(f => f.id === selectedFranchiseeId);
      if (franchisee) {
        const newView: ViewSelection = {
          type: 'all',
          id: franchisee.id,
          name: `Todos - ${franchisee.name}`,
        };
        lastSyncedView.current = `all:${franchisee.id}:`;
        setSelectedView(newView);
        return;
      }
    }
  }, [selectedCentreCode, selectedFranchiseeId, franchiseesWithCentres, setSelectedView]);
}
