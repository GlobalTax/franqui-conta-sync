import { useEffect } from 'react';
import { useView, ViewSelection } from '@/contexts/ViewContext';
import { useOrganization } from './useOrganization';
import { useCompanies } from './useCompanies';

/**
 * Hook that ensures a default view is selected when the user logs in
 * and companies data is available. This prevents the view indicator
 * from being hidden due to a null selectedView.
 */
export const useEnsureDefaultView = () => {
  const { selectedView, setSelectedView } = useView();
  const { currentMembership } = useOrganization();
  const { data: companies, isLoading } = useCompanies(currentMembership?.organization_id);

  useEffect(() => {
    // Only set default if:
    // 1. No view is currently selected
    // 2. We have a membership with an organization
    // 3. Companies data has loaded
    // 4. We have at least one company
    if (!selectedView && currentMembership?.organization_id && !isLoading && companies && companies.length > 0) {
      // Select the first company as consolidated view by default
      const firstCompany = companies[0];
      const defaultView: ViewSelection = {
        type: 'company',
        id: firstCompany.id,
        name: firstCompany.razon_social,
      };
      
      setSelectedView(defaultView);
    }
  }, [selectedView, currentMembership, companies, isLoading, setSelectedView]);

  return { selectedView, isLoading };
};
