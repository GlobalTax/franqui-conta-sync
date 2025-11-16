import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReprocessParams {
  invoiceId: string;
}

export function useReprocessInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ invoiceId }: ReprocessParams) => {
      // Get invoice file path and centro code
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices_received')
        .select('file_path, centro_code')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !invoice) {
        throw new Error('No se pudo recuperar la factura');
      }

      console.log('[Reprocess] Using Mindee OCR for reprocessing:', invoiceId);

      // Call Mindee OCR edge function
      const { data, error } = await supabase.functions.invoke('mindee-invoice-ocr', {
        body: {
          invoice_id: invoiceId,
          documentPath: invoice.file_path,
          centroCode: invoice.centro_code
        }
      });

      if (error) {
        console.error('[Reprocess] Mindee OCR error:', error);
        throw error;
      }

      console.log('[Reprocess] Mindee OCR success:', {
        confidence: data?.mindee_metadata?.confidence,
        fallbackUsed: data?.mindee_metadata?.fallback_used,
        cost: data?.mindee_metadata?.cost_euros
      });

      return data;
    },
    onSuccess: (data, variables) => {
      const mindeeConfidence = data?.mindee_metadata?.confidence || 0;
      const fallbackUsed = data?.mindee_metadata?.fallback_used || false;
      const cost = data?.mindee_metadata?.cost_euros || 0;

      if (fallbackUsed) {
        toast.warning(
          `Factura reprocesada con parsers de respaldo • Confianza: ${Math.round(mindeeConfidence)}% • €${cost.toFixed(4)}`,
          { description: 'Se recomienda revisión manual' }
        );
      } else if (mindeeConfidence < 70) {
        toast.warning(
          `Factura reprocesada • Confianza baja: ${Math.round(mindeeConfidence)}% • €${cost.toFixed(4)}`,
          { description: 'Revisar datos extraídos' }
        );
      } else {
        toast.success(
          `Factura reprocesada correctamente • Confianza: ${Math.round(mindeeConfidence)}% • €${cost.toFixed(4)}`
        );
      }

      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
    },
    onError: (error) => {
      console.error('Error reprocessing invoice:', error);
      toast.error('Error al reprocesar la factura', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
  });

  return {
    reprocess: mutation.mutate,
    isReprocessing: mutation.isPending,
  };
}
