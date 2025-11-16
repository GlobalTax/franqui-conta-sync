import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const RETRY_INTERVALS = [60000, 300000, 900000]; // 1m, 5m, 15m in milliseconds

interface RetryState {
  invoiceId: string;
  attemptCount: number;
  lastAttemptAt: Date;
  nextRetryAt: Date;
  isRetrying: boolean;
}

export const useOCRRetry = () => {
  const [retryStates, setRetryStates] = useState<Map<string, RetryState>>(new Map());
  const queryClient = useQueryClient();

  const scheduleRetry = useCallback((invoiceId: string, attemptCount: number = 0) => {
    const now = new Date();
    const intervalIndex = Math.min(attemptCount, RETRY_INTERVALS.length - 1);
    const nextRetry = new Date(now.getTime() + RETRY_INTERVALS[intervalIndex]);

    setRetryStates(prev => new Map(prev).set(invoiceId, {
      invoiceId,
      attemptCount,
      lastAttemptAt: now,
      nextRetryAt: nextRetry,
      isRetrying: false,
    }));

    return nextRetry;
  }, []);

  const { mutate: retryOCR, isPending: isRetrying } = useMutation({
    mutationFn: async ({ invoiceId, attemptCount = 0 }: { invoiceId: string; attemptCount?: number }) => {
      // Get invoice details
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices_received')
        .select('file_path, centro_code')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !invoice) {
        throw new Error('No se pudo recuperar la factura');
      }

      console.log('[useOCRRetry] Retrying with Mindee:', { invoiceId, attemptCount });

      // Trigger Mindee OCR reprocessing
      const { data, error } = await supabase.functions.invoke('mindee-invoice-ocr', {
        body: {
          invoice_id: invoiceId,
          documentPath: invoice.file_path,
          centroCode: invoice.centro_code
        }
      });

      if (error) {
        // Check if it's a rate limit issue
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          throw new Error('Límite de tasa excedido. Reintentando en 1 minuto...');
        }
        throw error;
      }

      return { data, attemptCount };
    },
    onSuccess: ({ data, attemptCount }, { invoiceId }) => {
      const mindeeConfidence = data?.mindee_metadata?.confidence || 0;
      const fallbackUsed = data?.mindee_metadata?.fallback_used || false;

      if (fallbackUsed) {
        toast.warning('OCR reprocesado con parsers de respaldo', {
          description: `Confianza: ${Math.round(mindeeConfidence)}% - Se recomienda revisión manual`
        });
      } else if (mindeeConfidence < 70) {
        toast.warning('OCR reprocesado con confianza baja', {
          description: `Confianza: ${Math.round(mindeeConfidence)}% - Revisar datos extraídos`
        });
      } else {
        toast.success('OCR reprocesado exitosamente', {
          description: `Confianza: ${Math.round(mindeeConfidence)}%`
        });
      }

      setRetryStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(invoiceId);
        return newMap;
      });
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
    onError: (error: Error, { invoiceId, attemptCount = 0 }) => {
      const shouldScheduleRetry = 
        error.message.includes('temporalmente no disponible') ||
        error.message.includes('Límite de tasa');

      if (shouldScheduleRetry && attemptCount < RETRY_INTERVALS.length) {
        const nextRetry = scheduleRetry(invoiceId, attemptCount + 1);
        const minutesUntil = Math.ceil((nextRetry.getTime() - Date.now()) / 60000);
        
        toast.warning(
          `Reintento programado en ${minutesUntil} minuto${minutesUntil !== 1 ? 's' : ''}`,
          {
            description: error.message,
          }
        );

        // Schedule automatic retry
        setTimeout(() => {
          retryOCR({ invoiceId, attemptCount: attemptCount + 1 });
        }, RETRY_INTERVALS[Math.min(attemptCount, RETRY_INTERVALS.length - 1)]);
      } else {
        toast.error('Error al reprocesar OCR', {
          description: error.message,
        });
        setRetryStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(invoiceId);
          return newMap;
        });
      }
    },
  });

  const cancelRetry = useCallback((invoiceId: string) => {
    setRetryStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(invoiceId);
      return newMap;
    });
    toast.info('Reintento cancelado');
  }, []);

  const getRetryState = useCallback((invoiceId: string) => {
    return retryStates.get(invoiceId);
  }, [retryStates]);

  return {
    retryOCR,
    isRetrying,
    scheduleRetry,
    cancelRetry,
    getRetryState,
    retryStates: Array.from(retryStates.values()),
  };
};
