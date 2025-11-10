import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type OCRProcessingLog = Database['public']['Tables']['ocr_processing_log']['Row'];

export const useOCRProcessingLogs = (invoiceId: string | null) => {
  return useQuery({
    queryKey: ['ocr-processing-logs', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      
      const { data, error } = await supabase
        .from('ocr_processing_log')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching OCR logs:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!invoiceId
  });
};
