import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceCommands } from '@/infrastructure/persistence/supabase/commands/InvoiceCommands';

interface ApproveInvoiceParams {
  invoiceId: string;
  userId: string;
  centroCode?: string;
  comments?: string;
}

interface RejectInvoiceParams {
  invoiceId: string;
  userId: string;
  reason: string;
}

interface ReprocessOCRParams {
  invoiceId: string;
  engine: 'openai' | 'mindee';
}

/**
 * Hook para gestionar acciones individuales sobre facturas
 * Centraliza las mutaciones: Aprobar, Rechazar, Re-procesar OCR
 */
export function useInvoiceActions() {
  const queryClient = useQueryClient();

  // ========== MUTATION: Aprobar factura ==========
  const approveMutation = useMutation({
    mutationFn: async (params: ApproveInvoiceParams) => {
      return InvoiceCommands.approveInvoice({
        invoiceId: params.invoiceId,
        userId: params.userId,
        centroCode: params.centroCode || '',
        comments: params.comments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['digitization-metrics'] });
      toast.success('Factura aprobada correctamente');
    },
    onError: (error: any) => {
      console.error('Error approving invoice:', error);
      toast.error(`Error al aprobar: ${error.message}`);
    }
  });

  // ========== MUTATION: Rechazar factura ==========
  const rejectMutation = useMutation({
    mutationFn: async (params: RejectInvoiceParams) => {
      return InvoiceCommands.rejectInvoice({
        invoiceId: params.invoiceId,
        userId: params.userId,
        reason: params.reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['digitization-metrics'] });
      toast.success('Factura rechazada');
    },
    onError: (error: any) => {
      console.error('Error rejecting invoice:', error);
      toast.error(`Error al rechazar: ${error.message}`);
    }
  });

  // ========== MUTATION: Re-procesar OCR ==========
  const reprocessOCRMutation = useMutation({
    mutationFn: async (params: ReprocessOCRParams) => {
      const { data, error } = await supabase.functions.invoke('ocr-reprocess', {
        body: params
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['ocr-processing-logs'] });
      queryClient.invalidateQueries({ queryKey: ['digitization-metrics'] });
      
      if (data?.confidence) {
        toast.success(`OCR reprocesado: ${Math.round(data.confidence * 100)}% confianza`);
      } else {
        toast.success('OCR reprocesado correctamente');
      }
    },
    onError: (error: any) => {
      console.error('Error reprocessing OCR:', error);
      toast.error(`Error al reprocesar: ${error.message}`);
    }
  });

  return {
    approve: (params: ApproveInvoiceParams) => approveMutation.mutateAsync(params),
    reject: (params: RejectInvoiceParams) => rejectMutation.mutateAsync(params),
    reprocessOCR: (params: ReprocessOCRParams) => reprocessOCRMutation.mutateAsync(params),
    isLoading: approveMutation.isPending || rejectMutation.isPending || reprocessOCRMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isReprocessing: reprocessOCRMutation.isPending
  };
}
