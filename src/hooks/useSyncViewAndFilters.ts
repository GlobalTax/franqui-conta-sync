import { useEffect, useRef } from 'react';
import { useView, ViewSelection } from '@/contexts/ViewContext';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import { useAllUserCentres } from '@/hooks/useAllUserCentres';
import { useAllUserCompanies } from '@/hooks/useAllUserCompanies';

/**
 * Synchronizes ViewContext (sidebar CentreSelector) with useGlobalFilters (top bar CompactOrgSelector).
 * Supports 3 hierarchy levels: franchisee (consolidated) > company > centre
 */
export function useSyncViewAndFilters() {
  const { selectedView, setSelectedView } = useView();
  const { selectedCentreCode, selectedCompanyId, selectedFranchiseeId, setFilters } = useGlobalFilters();
  const { data: franchiseesWithCentres } = useAllUserCentres();
  const { data: franchiseesWithCompanies } = useAllUserCompanies();

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
    if (!franchiseesWithCentres || !franchiseesWithCompanies) return;

    const viewKey = `${selectedView.type}:${selectedView.id}:${selectedView.code || ''}`;
    if (viewKey === lastSyncedView.current) return;

    lastSyncedView.current = viewKey;
    syncSourceRef.current = 'view';

    if (selectedView.type === 'centre') {
      let franchiseeId: string | null = null;
      let companyId: string | null = null;

      for (const f of franchiseesWithCentres) {
        if (f.centres.find(c => c.id === selectedView.id || c.codigo === selectedView.code)) {
          franchiseeId = f.id;
          break;
        }
      }

      for (const f of franchiseesWithCompanies) {
        for (const company of f.companies) {
          if (company.centres?.some(c => c.id === selectedView.id || c.codigo === selectedView.code)) {
            companyId = company.id;
            break;
          }
        }
        if (companyId) break;
      }

      const filtersKey = `${franchiseeId}:${companyId}:${selectedView.code}`;
      lastSyncedFilters.current = filtersKey;

      setFilters({
        franchiseeId,
        companyId,
        centreCode: selectedView.code || null,
      });
    } else if (selectedView.type === 'company') {
      let franchiseeId: string | null = null;
      for (const f of franchiseesWithCompanies) {
        if (f.companies.some(c => c.id === selectedView.id)) {
          franchiseeId = f.id;
          break;
        }
      }

      const filtersKey = `${franchiseeId}:${selectedView.id}:`;
      lastSyncedFilters.current = filtersKey;

      setFilters({
        franchiseeId,
        companyId: selectedView.id,
        centreCode: null,
      });
    } else {
      // 'all' view — could be franchisee-level consolidated
      const filtersKey = `${selectedView.id || ''}::`;
      lastSyncedFilters.current = filtersKey;

      // If 'all' has an id, it's a franchisee-level selection
      setFilters({
        franchiseeId: selectedView.id || null,
        companyId: null,
        centreCode: null,
      });
    }
  }, [selectedView, franchiseesWithCentres, franchiseesWithCompanies, setFilters]);

  // Sync GlobalFilters → ViewContext
  useEffect(() => {
    if (syncSourceRef.current === 'view') {
      syncSourceRef.current = null;
      return;
    }

    if (!franchiseesWithCentres || !franchiseesWithCompanies) return;

    const filtersKey = `${selectedFranchiseeId || ''}:${selectedCompanyId || ''}:${selectedCentreCode || ''}`;
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
    } else if (selectedCompanyId) {
      for (const f of franchiseesWithCompanies) {
        const company = f.companies.find(c => c.id === selectedCompanyId);
        if (company) {
          const newView: ViewSelection = {
            type: 'company',
            id: company.id,
            code: company.cif,
            name: company.razon_social,
          };
          lastSyncedView.current = `company:${company.id}:${company.cif}`;
          setSelectedView(newView);
          return;
        }
      }
    } else if (selectedFranchiseeId) {
      // Franchisee-only = consolidated "all" view for that franchisee
      const franchisee = franchiseesWithCentres.find(f => f.id === selectedFranchiseeId)
        || franchiseesWithCompanies?.find(f => f.id === selectedFranchiseeId);
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
    // If nothing selected, don't change view
  }, [selectedCentreCode, selectedCompanyId, selectedFranchiseeId, franchiseesWithCentres, franchiseesWithCompanies, setSelectedView]);
}
