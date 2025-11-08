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

      // Priority 1: If user has a specific restaurant_id in their membership, use it
      if (currentMembership.restaurant_id) {
        try {
          const { data: centre } = await supabase
            .from('centres')
            .select('id, codigo, nombre')
            .eq('id', currentMembership.restaurant_id)
            .single();

          if (centre) {
            const defaultView: ViewSelection = {
              type: 'centre',
              id: centre.id,
              name: `${centre.codigo} - ${centre.nombre}`,
            };
            setSelectedView(defaultView);
            return;
          }
        } catch (error) {
          console.error('Error loading specific centre from membership:', error);
        }
      }

      // Priority 2: Default to "all centres" (consolidated view)
      if (centres && centres.length > 0) {
        const defaultView: ViewSelection = {
          type: 'all',
          id: currentMembership.organization_id,
          name: 'Todos los Centros',
        };
        setSelectedView(defaultView);
      }
    };

    initializeView();
  }, [selectedView, currentMembership, centres, isLoading, setSelectedView]);

  return { selectedView, isLoading };
};
