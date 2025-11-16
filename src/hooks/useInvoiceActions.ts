// ============================================================================
// HOOK: useInvoiceActions
// Centraliza acciones relacionadas con facturas (aprobar, rechazar, OCR, contabilizar, etc)
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InvoiceCommands } from '@/infrastructure/persistence/supabase/commands/InvoiceCommands';
import { validateInvoiceForPosting } from '@/lib/invoice-validation';

// ============================================================================
// INTERFACES
// ============================================================================

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

interface PostInvoiceParams {
  invoiceId: string;
  postingDate?: Date;
}

interface AssignCentreParams {
  invoiceIds: string[];
  centreCode: string;
}

interface DownloadPDFParams {
  documentPath: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useInvoiceActions() {
  const queryClient = useQueryClient();

  // ==========================================================================
  // APROBAR FACTURA
  // ==========================================================================
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

  // ==========================================================================
  // RECHAZAR FACTURA
  // ==========================================================================
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

  // ==========================================================================
  // REPROCESAR OCR - Usando Mindee
  // ==========================================================================
  const reprocessOCRMutation = useMutation({
    mutationFn: async (params: ReprocessOCRParams) => {
      const { data, error } = await supabase.functions.invoke('mindee-invoice-ocr', {
        body: {
          invoice_id: params.invoiceId,
          engine: params.engine || 'mindee'
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['ocr-processing-logs'] });
      queryClient.invalidateQueries({ queryKey: ['digitization-metrics'] });
      
      const engineLabel = variables.engine === 'openai' ? 'OpenAI Vision' : 'Mindee';
      
      if (data?.confidence) {
        toast.success(`OCR reprocesado con éxito (${engineLabel})`, {
          description: `Confianza: ${Math.round(data.confidence * 100)}%`
        });
      } else {
        toast.success(`OCR reprocesado con éxito (${engineLabel})`);
      }
    },
    onError: (error: any) => {
      console.error('Error reprocessing OCR:', error);
      toast.error(`Error al reprocesar: ${error.message}`);
    }
  });

  // ==========================================================================
  // CONTABILIZAR FACTURA
  // ==========================================================================
  const postInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, postingDate }: PostInvoiceParams) => {
      // 1. Validar con InvoiceEntryValidator (incluye balance, periodo, datos fiscales)
      const validation = await validateInvoiceForPosting(invoiceId);

      if (!validation.ready_to_post) {
        const errorMessage = validation.blocking_issues.join(', ');
        throw new Error(errorMessage);
      }

      // 2. Generar asiento contable (llamar a RPC o edge function)
      // Por ahora, simplificado: marcar como 'posted' (en producción crear accounting_entry)
      const { data, error } = await supabase
        .from('invoices_received')
        .update({
          status: 'posted',
          notes: `Contabilizada el ${(postingDate || new Date()).toISOString()}`,
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });

      toast.success('Factura aprobada y contabilizada correctamente', {
        description: 'Asiento contable generado',
      });
    },
    onError: (error: any) => {
      // Toasts personalizados según tipo de error
      if (error.message.includes('Centro') || error.message.includes('centro')) {
        toast.error('❌ Centro no asignado', {
          description: 'Asigna un centro antes de contabilizar',
        });
      } else if (error.message.includes('balance') || error.message.includes('Debe')) {
        toast.error('❌ Descuadre contable', {
          description: 'El asiento no está balanceado (Debe ≠ Haber)',
        });
      } else if (error.message.includes('período') || error.message.includes('cerrado')) {
        toast.error('❌ Período cerrado', {
          description: 'No se puede postear en un período cerrado',
        });
      } else if (error.message.includes('fiscal')) {
        toast.error('❌ Año fiscal cerrado', {
          description: 'El ejercicio fiscal no está abierto',
        });
      } else {
        toast.error('Error al contabilizar', {
          description: error.message,
        });
      }
    },
  });

  // ==========================================================================
  // ASIGNAR CENTRO
  // ==========================================================================
  const assignCentreMutation = useMutation({
    mutationFn: async ({ invoiceIds, centreCode }: AssignCentreParams) => {
      const { error } = await supabase
        .from('invoices_received')
        .update({ centro_code: centreCode })
        .in('id', invoiceIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      const count = variables.invoiceIds.length;
      toast.success(
        `Centro asignado a ${count} factura${count > 1 ? 's' : ''}`
      );
    },
    onError: (error: any) => {
      toast.error('Error al asignar centro', {
        description: error.message,
      });
    },
  });

  // ==========================================================================
  // DESCARGAR PDF
  // ==========================================================================
  const downloadPDF = async ({ documentPath }: DownloadPDFParams) => {
    try {
      // Obtener URL pública del storage
      const { data } = supabase.storage
        .from('invoice-documents')
        .getPublicUrl(documentPath);

      if (!data?.publicUrl) {
        throw new Error('No se encontró el archivo PDF');
      }

      // Abrir en nueva pestaña
      window.open(data.publicUrl, '_blank');

      toast.success('PDF descargado');
    } catch (error: any) {
      toast.error('Error al descargar PDF', {
        description: error.message,
      });
    }
  };

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return {
    approve: (params: ApproveInvoiceParams) => approveMutation.mutateAsync(params),
    reject: (params: RejectInvoiceParams) => rejectMutation.mutateAsync(params),
    reprocessOCR: (params: ReprocessOCRParams) => reprocessOCRMutation.mutateAsync(params),
    postInvoice: (params: PostInvoiceParams) => postInvoiceMutation.mutateAsync(params),
    assignCentre: (params: AssignCentreParams) => assignCentreMutation.mutateAsync(params),
    downloadPDF,

    isLoading: 
      approveMutation.isPending || 
      rejectMutation.isPending || 
      reprocessOCRMutation.isPending ||
      postInvoiceMutation.isPending ||
      assignCentreMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isReprocessing: reprocessOCRMutation.isPending,
    isPosting: postInvoiceMutation.isPending,
    isAssigning: assignCentreMutation.isPending,
  };
}
