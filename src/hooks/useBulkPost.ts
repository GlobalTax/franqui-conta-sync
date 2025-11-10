// ============================================================================
// HOOK: useBulkPost
// Contabilización masiva de facturas
// ============================================================================

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BulkPostParams {
  invoiceIds: string[];
  postingDate: Date;
}

export function useBulkPost() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const bulkPostMutation = useMutation({
    mutationFn: async ({ invoiceIds, postingDate }: BulkPostParams) => {
      setProgress({ current: 0, total: invoiceIds.length });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ invoiceId: string; error: string }>,
      };

      for (let i = 0; i < invoiceIds.length; i++) {
        const invoiceId = invoiceIds[i];
        
        try {
          // Get invoice data with supplier
          const { data: invoice, error: fetchError } = await supabase
            .from('invoices_received')
            .select(`
              *,
              supplier:suppliers(name)
            `)
            .eq('id', invoiceId)
            .single();

          if (fetchError || !invoice) {
            throw new Error('Factura no encontrada');
          }

          // Validate
          if (invoice.approval_status !== 'approved_accounting') {
            throw new Error('No aprobada contablemente');
          }
          if (!invoice.centro_code) {
            throw new Error('Sin centro asignado');
          }
          if (invoice.entry_id) {
            throw new Error('Ya contabilizada');
          }

          // Mark invoice as posted (simplified - in production create proper accounting entries)
          await supabase
            .from('invoices_received')
            .update({ 
              status: 'posted',
              notes: `Contabilizada el ${postingDate.toISOString()}` 
            })
            .eq('id', invoiceId);

          results.success++;
        } catch (error: any) {
          console.error(`Error posting invoice ${invoiceId}:`, error);
          results.failed++;
          results.errors.push({
            invoiceId,
            error: error.message || 'Error desconocido',
          });
        }

        setProgress({ current: i + 1, total: invoiceIds.length });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      queryClient.invalidateQueries({ queryKey: ['accounting_entries'] });

      if (results.failed === 0) {
        toast.success(`✓ ${results.success} factura${results.success > 1 ? 's' : ''} contabilizada${results.success > 1 ? 's' : ''}`);
      } else {
        toast.warning(
          `✓ ${results.success} facturas contabilizadas. ${results.failed} fallaron.`,
          {
            description: results.errors.length > 0 ? results.errors[0].error : undefined,
          }
        );
      }

      setProgress({ current: 0, total: 0 });
    },
    onError: (error: Error) => {
      console.error('Error in bulk post:', error);
      toast.error(`Error: ${error.message}`);
      setProgress({ current: 0, total: 0 });
    },
  });

  return {
    bulkPost: bulkPostMutation.mutate,
    isPosting: bulkPostMutation.isPending,
    progress: bulkPostMutation.isPending ? progress : undefined,
  };
}
