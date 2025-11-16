// ============================================================================
// MINDEE INVOICE OCR HOOK
// Hook para procesar facturas con Mindee OCR
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MindeeOCRParams {
  invoiceId: string;
  documentPath: string;
  centroCode: string;
}

export interface MindeeOCRResult {
  success: boolean;
  invoice_id: string;
  mindee_document_id?: string;
  mindee_confidence?: number;
  mindee_processing_time?: number;
  mindee_cost_euros?: number;
  mindee_pages?: number;
  ocr_engine: string;
  ocr_fallback_used?: boolean;
  approval_status: string;
  needs_manual_review?: boolean;
  supplier_name?: string;
  field_confidence_scores?: Record<string, number>;
  validation?: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  error?: string;
}

/**
 * Hook para procesar factura con Mindee OCR
 * Llama al edge function mindee-invoice-ocr
 */
export const useMindeeInvoiceOCR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MindeeOCRParams): Promise<MindeeOCRResult> => {
      console.log('[useMindeeInvoiceOCR] Iniciando procesamiento:', params);

      const { data, error } = await supabase.functions.invoke('mindee-invoice-ocr', {
        body: {
          invoice_id: params.invoiceId,
          documentPath: params.documentPath,
          centroCode: params.centroCode,
        },
      });

      if (error) {
        console.error('[useMindeeInvoiceOCR] Error:', error);
        throw new Error(error.message || 'Error procesando factura con Mindee');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido en procesamiento Mindee');
      }

      console.log('[useMindeeInvoiceOCR] ✓ Procesamiento completado:', {
        invoiceId: data.invoice_id,
        mindeeDocId: data.mindee_document_id,
        confidence: data.mindee_confidence,
        cost: data.mindee_cost_euros,
        needsReview: data.needs_manual_review,
        fallbackUsed: data.ocr_fallback_used,
      });

      return data as MindeeOCRResult;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['invoice', result.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-received'] });

      // Toast según resultado
      if (result.needs_manual_review) {
        toast.warning('Factura procesada - Requiere revisión manual', {
          description: `Proveedor: ${result.supplier_name || 'Desconocido'}`,
        });
      } else if (result.ocr_fallback_used) {
        toast.info('Factura procesada con parsers de respaldo', {
          description: `Confianza: ${result.mindee_confidence?.toFixed(0)}%`,
        });
      } else {
        toast.success('Factura procesada correctamente', {
          description: `Confianza: ${result.mindee_confidence?.toFixed(0)}% | Coste: ${result.mindee_cost_euros?.toFixed(4)}€`,
        });
      }

      // Log validations si hay errores
      if (result.validation && result.validation.errors.length > 0) {
        console.warn('[useMindeeInvoiceOCR] Errores de validación:', result.validation.errors);
      }
    },
    onError: (error: Error) => {
      console.error('[useMindeeInvoiceOCR] Error en mutation:', error);
      toast.error('Error procesando factura', {
        description: error.message,
      });
    },
  });
};

/**
 * Hook para reprocesar factura con Mindee
 * (útil para reintentos manuales)
 */
export const useReprocessMindeeOCR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string): Promise<MindeeOCRResult> => {
      console.log('[useReprocessMindeeOCR] Reprocesando factura:', invoiceId);

      // Obtener documento path de la factura
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices_received')
        .select('file_path, centro_code')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !invoice) {
        throw new Error('No se pudo recuperar la factura');
      }

      const { data, error } = await supabase.functions.invoke('mindee-invoice-ocr', {
        body: {
          invoice_id: invoiceId,
          documentPath: invoice.file_path,
          centroCode: invoice.centro_code,
        },
      });

      if (error) {
        throw new Error(error.message || 'Error reprocesando con Mindee');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido en reprocesamiento');
      }

      return data as MindeeOCRResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', result.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast.success('Factura reprocesada correctamente', {
        description: `Confianza: ${result.mindee_confidence?.toFixed(0)}%`,
      });
    },
    onError: (error: Error) => {
      toast.error('Error reprocesando factura', {
        description: error.message,
      });
    },
  });
};
