import { useEffect, useRef } from 'react';
import { useView, ViewSelection } from '@/contexts/ViewContext';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import { useAllUserCentres } from '@/hooks/useAllUserCentres';
import { useAllUserCompanies } from '@/hooks/useAllUserCompanies';

/**
 * Purpose: Synchronizes ViewContext (sidebar CentreSelector) with useGlobalFilters (top bar CompactOrgSelector).
 * When one changes, the other is updated to match, ensuring a single source of truth.
 * 
 * Direction:
 * - ViewContext → GlobalFilters: When sidebar selector changes, update top bar filters
 * - GlobalFilters → ViewContext: When top bar filters change, update sidebar view
 */
export function useSyncViewAndFilters() {
  const { selectedView, setSelectedView } = useView();
  const { selectedCentreCode, selectedCompanyId, selectedFranchiseeId, setFilters } = useGlobalFilters();
  const { data: franchiseesWithCentres } = useAllUserCentres();
  const { data: franchiseesWithCompanies } = useAllUserCompanies();

  // Track which system triggered the last change to avoid infinite loops
  const syncSourceRef = useRef<'view' | 'filters' | null>(null);
  const prevViewRef = useRef<ViewSelection | null>(null);
  const prevCentreCodeRef = useRef<string | null>(null);
  const prevCompanyIdRef = useRef<string | null>(null);

  // Sync ViewContext → GlobalFilters
  useEffect(() => {
    if (syncSourceRef.current === 'filters') {
      syncSourceRef.current = null;
      return;
    }

    if (!selectedView || selectedView === prevViewRef.current) return;
    
    // Check if the view actually changed (deep compare)
    if (prevViewRef.current && 
        prevViewRef.current.type === selectedView.type && 
        prevViewRef.current.id === selectedView.id) {
      return;
    }

    prevViewRef.current = selectedView;
    syncSourceRef.current = 'view';

    if (selectedView.type === 'centre') {
      // Find which franchisee owns this centre
      let franchiseeId: string | null = null;
      let companyId: string | null = null;

      if (franchiseesWithCentres) {
        for (const f of franchiseesWithCentres) {
          const centre = f.centres.find(c => c.id === selectedView.id || c.codigo === selectedView.code);
          if (centre) {
            franchiseeId = f.id;
            break;
          }
        }
      }

      if (franchiseesWithCompanies) {
        for (const f of franchiseesWithCompanies) {
          for (const company of f.companies) {
            const hasCentre = company.centres?.some(c => c.id === selectedView.id || c.codigo === selectedView.code);
            if (hasCentre) {
              companyId = company.id;
              break;
            }
          }
          if (companyId) break;
        }
      }

      prevCentreCodeRef.current = selectedView.code || null;
      prevCompanyIdRef.current = companyId;

      setFilters({
        franchiseeId,
        companyId,
        centreCode: selectedView.code || null,
      });
    } else if (selectedView.type === 'company') {
      let franchiseeId: string | null = null;
      if (franchiseesWithCompanies) {
        for (const f of franchiseesWithCompanies) {
          if (f.companies.some(c => c.id === selectedView.id)) {
            franchiseeId = f.id;
            break;
          }
        }
      }

      prevCentreCodeRef.current = null;
      prevCompanyIdRef.current = selectedView.id;

      setFilters({
        franchiseeId,
        companyId: selectedView.id,
        centreCode: null,
      });
    } else {
      // 'all' view
      prevCentreCodeRef.current = null;
      prevCompanyIdRef.current = null;

      setFilters({
        franchiseeId: null,
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

    // Only sync if filters actually changed
    if (selectedCentreCode === prevCentreCodeRef.current && 
        selectedCompanyId === prevCompanyIdRef.current) {
      return;
    }

    prevCentreCodeRef.current = selectedCentreCode;
    prevCompanyIdRef.current = selectedCompanyId;
    syncSourceRef.current = 'filters';

    if (selectedCentreCode) {
      // Find the centre details
      if (franchiseesWithCentres) {
        for (const f of franchiseesWithCentres) {
          const centre = f.centres.find(c => c.codigo === selectedCentreCode);
          if (centre) {
            prevViewRef.current = {
              type: 'centre',
              id: centre.id,
              code: centre.codigo,
              name: `${centre.codigo} - ${centre.nombre}`,
            };
            setSelectedView(prevViewRef.current);
            return;
          }
        }
      }
    } else if (selectedCompanyId) {
      // Find the company details
      if (franchiseesWithCompanies) {
        for (const f of franchiseesWithCompanies) {
          const company = f.companies.find(c => c.id === selectedCompanyId);
          if (company) {
            prevViewRef.current = {
              type: 'company',
              id: company.id,
              code: company.cif,
              name: company.razon_social,
            };
            setSelectedView(prevViewRef.current);
            return;
          }
        }
      }
    }
    // If only franchisee is selected (no company or centre), don't change view
  }, [selectedCentreCode, selectedCompanyId, franchiseesWithCentres, franchiseesWithCompanies, setSelectedView]);
}
