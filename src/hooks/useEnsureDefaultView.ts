import { useEffect } from 'react';
import { useView, ViewSelection } from '@/contexts/ViewContext';
import { useOrganization } from './useOrganization';
import { useCentres } from './useCentres';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that ensures a default view is selected when the user logs in.
 * Prioritizes restaurant_id from membership, then defaults to "all centres".
 */
export const useEnsureDefaultView = () => {
  const { selectedView, setSelectedView } = useView();
  const { currentMembership } = useOrganization();
  const { data: centres, isLoading } = useCentres(currentMembership?.organization_id);

  useEffect(() => {
    const initializeView = async () => {
      // Only set default if no view is currently selected
      if (selectedView || !currentMembership?.organization_id || isLoading) {
        return;
      }

      // Only set view if user has a specific restaurant_id in their membership
      if (currentMembership.restaurant_id && centres) {
        const prioritizedCentre = centres.find(
          (c) => c.id === currentMembership.restaurant_id
        );

        if (prioritizedCentre) {
          const defaultView: ViewSelection = {
            type: 'centre',
            id: prioritizedCentre.id,
            name: `${prioritizedCentre.codigo} - ${prioritizedCentre.nombre}`,
          };
          setSelectedView(defaultView);
        }
      }
      // If no restaurant_id, let CentreSelector handle the default (first company)
    };

    initializeView();
  }, [selectedView, currentMembership, centres, isLoading, setSelectedView]);

  return { selectedView, isLoading };
};
