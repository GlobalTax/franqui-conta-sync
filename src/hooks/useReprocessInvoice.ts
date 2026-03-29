import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ReprocessParams {
  invoiceId: string;
}

export function useReprocessInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ invoiceId }: ReprocessParams) => {
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices_received')
        .select('file_path, centro_code')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !invoice) {
        throw new Error('No se pudo recuperar la factura');
      }

      logger.info('useReprocessInvoice', 'Using Claude Vision OCR:', invoiceId);

      const { data, error } = await supabase.functions.invoke('claude-invoice-ocr', {
        body: {
          invoice_id: invoiceId,
          documentPath: invoice.file_path,
          centroCode: invoice.centro_code
        }
      });

      if (error) {
        logger.error('useReprocessInvoice', 'Claude OCR error:', error);
        throw error;
      }

      logger.info('useReprocessInvoice', 'Claude OCR success:', {
        confidence: data?.ocr_confidence,
        cost: data?.ocr_cost_euros,
        needsReview: data?.needs_manual_review
      });

      return data;
    },
    onSuccess: (data, variables) => {
      const confidence = data?.ocr_confidence || 0;
      const needsReview = data?.needs_manual_review || false;
      const cost = data?.ocr_cost_euros || 0;

      if (needsReview) {
        toast.warning(
          `Factura reprocesada - Requiere revisión • Confianza: ${Math.round(confidence)}% • €${cost.toFixed(4)}`,
          { description: 'Se recomienda revisión manual' }
        );
      } else if (confidence < 70) {
        toast.warning(
          `Factura reprocesada • Confianza baja: ${Math.round(confidence)}% • €${cost.toFixed(4)}`,
          { description: 'Revisar datos extraídos' }
        );
      } else {
        toast.success(
          `Factura reprocesada correctamente • Confianza: ${Math.round(confidence)}% • €${cost.toFixed(4)}`
        );
      }

      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
    },
    onError: (error) => {
      logger.error('useReprocessInvoice', 'Error reprocessing invoice:', error);
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
