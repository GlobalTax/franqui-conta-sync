import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReprocessParams {
  invoiceId: string;
  provider: 'openai' | 'mindee';
}

export function useReprocessInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ invoiceId, provider }: ReprocessParams) => {
      const { data, error } = await supabase.functions.invoke('invoice-ocr', {
        body: { 
          invoiceId, 
          provider,
          reprocess: true 
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Factura reprocesada correctamente');
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
    },
    onError: (error) => {
      console.error('Error reprocessing invoice:', error);
      toast.error('Error al reprocesar la factura');
    },
  });

  return {
    reprocess: mutation.mutate,
    isReprocessing: mutation.isPending,
  };
}
