// ============================================================================
// CLAUDE INVOICE OCR HOOK
// Hook para procesar facturas con Claude Vision (reemplaza Mindee)
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface ClaudeOCRParams {
  invoiceId: string;
  documentPath: string;
  centroCode: string;
}

export interface ClaudeOCRResult {
  success: boolean;
  invoice_id: string;
  ocr_engine: 'claude';
  ocr_confidence?: number;
  ocr_cost_euros?: number;
  ocr_processing_time_ms?: number;
  ocr_tokens?: { input: number; output: number };
  needs_manual_review?: boolean;
  approval_status: string;
  supplier_name?: string;
  validation?: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  autofix_applied?: string[];
  error?: string;
}

export const useClaudeInvoiceOCR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ClaudeOCRParams): Promise<ClaudeOCRResult> => {
      logger.info('useClaudeInvoiceOCR', 'Iniciando procesamiento:', params);

      const { data, error } = await supabase.functions.invoke('claude-invoice-ocr', {
        body: {
          invoice_id: params.invoiceId,
          documentPath: params.documentPath,
          centroCode: params.centroCode,
        },
      });

      if (error) {
        logger.error('useClaudeInvoiceOCR', 'Error:', error);
        throw new Error(error.message || 'Error procesando factura con Claude');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido en procesamiento Claude');
      }

      logger.info('useClaudeInvoiceOCR', 'Completado:', {
        invoiceId: data.invoice_id,
        confidence: data.ocr_confidence,
        cost: data.ocr_cost_euros,
        timeMs: data.ocr_processing_time_ms,
      });

      return data as ClaudeOCRResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', result.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-received'] });

      if (result.needs_manual_review) {
        toast.warning('Factura procesada - Requiere revisión manual', {
          description: `Proveedor: ${result.supplier_name || 'Desconocido'}`,
        });
      } else {
        toast.success('Factura procesada correctamente', {
          description: `Confianza: ${result.ocr_confidence?.toFixed(0)}% | Coste: €${result.ocr_cost_euros?.toFixed(4)}`,
        });
      }

      if (result.validation && result.validation.errors.length > 0) {
        logger.warn('useClaudeInvoiceOCR', 'Errores de validacion:', result.validation.errors);
      }
    },
    onError: (error: Error) => {
      logger.error('useClaudeInvoiceOCR', 'Error en mutation:', error);
      toast.error('Error procesando factura', { description: error.message });
    },
  });
};

export const useReprocessClaudeOCR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string): Promise<ClaudeOCRResult> => {
      logger.info('useReprocessClaudeOCR', 'Reprocesando:', invoiceId);

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices_received')
        .select('file_path, centro_code')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !invoice) {
        throw new Error('No se pudo recuperar la factura');
      }

      const { data, error } = await supabase.functions.invoke('claude-invoice-ocr', {
        body: {
          invoice_id: invoiceId,
          documentPath: invoice.file_path,
          centroCode: invoice.centro_code,
        },
      });

      if (error) throw new Error(error.message || 'Error reprocesando con Claude');
      if (!data?.success) throw new Error(data?.error || 'Error desconocido');

      return data as ClaudeOCRResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', result.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Factura reprocesada correctamente', {
        description: `Confianza: ${result.ocr_confidence?.toFixed(0)}%`,
      });
    },
    onError: (error: Error) => {
      toast.error('Error reprocesando factura', { description: error.message });
    },
  });
};
