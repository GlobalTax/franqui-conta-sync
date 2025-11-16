import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CorrectionInput } from '@/types/learning';

export function useRecordCorrection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (correction: CorrectionInput) => {
      const { data, error } = await supabase.functions.invoke('record-correction', {
        body: correction,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['learned-patterns'] });
      
      if (data.pattern_detected) {
        toast.success(
          '✅ Corrección guardada y patrón detectado',
          {
            description: 'El sistema aprenderá de esta corrección para futuras facturas.',
          }
        );
      } else {
        toast.success('✅ Corrección guardada');
      }
    },
    onError: (error) => {
      console.error('Error recording correction:', error);
      toast.error('Error al guardar la corrección');
    },
  });
}
