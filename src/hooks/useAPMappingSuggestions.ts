import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { APMappingResult } from './useInvoiceOCR';

export interface GetMappingParams {
  supplierVatId: string;
  centroCode: string;
  lines?: Array<{ 
    description?: string; 
    quantity?: number; 
    unit_price?: number;
  }>;
}

/**
 * Hook para obtener sugerencias de cuentas AP en tiempo real
 * Usado en el formulario de creación manual de facturas
 */
export function useAPMappingSuggestions() {
  return useMutation({
    mutationFn: async (params: GetMappingParams): Promise<APMappingResult> => {
      const { data, error } = await supabase.functions.invoke('get-ap-mapping', {
        body: params
      });

      if (error) {
        throw new Error(error.message || 'Error al obtener sugerencias AP');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en AP mapping');
      }

      return data.ap_mapping as APMappingResult;
    }
  });
}
