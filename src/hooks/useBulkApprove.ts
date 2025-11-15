// ============================================================================
// HOOK: useBulkApprove
// Aprobación masiva de facturas
// ============================================================================

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BulkApproveParams {
  invoiceIds: string[];
}

export function useBulkApprove() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ invoiceIds }: BulkApproveParams) => {
      setProgress({ current: 0, total: invoiceIds.length });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ invoiceId: string; error: string }>,
      };

      for (let i = 0; i < invoiceIds.length; i++) {
        const invoiceId = invoiceIds[i];
        
        try {
          // Get current invoice status
          const { data: invoice, error: fetchError } = await supabase
            .from('invoices_received')
            .select('id, status, approval_status')
            .eq('id', invoiceId)
            .single();

          if (fetchError || !invoice) {
            throw new Error('Factura no encontrada');
          }

          // Validate can be approved
          if (invoice.status === 'posted') {
            throw new Error('Ya contabilizada');
          }
          if (invoice.approval_status === 'approved_accounting') {
            throw new Error('Ya aprobada');
          }

          // Approve invoice
          const { error: updateError } = await supabase
            .from('invoices_received')
            .update({ 
              approval_status: 'approved_accounting',
              status: 'approved',
              approved_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);

          if (updateError) throw updateError;

          results.success++;
        } catch (error: any) {
          console.error(`Error approving invoice ${invoiceId}:`, error);
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

      if (results.failed === 0) {
        toast.success(`✅ ${results.success} factura${results.success > 1 ? 's' : ''} aprobada${results.success > 1 ? 's' : ''}`);
      } else {
        toast.warning(
          `✅ ${results.success} aprobadas. ${results.failed} fallaron.`,
          {
            description: results.errors.length > 0 ? results.errors[0].error : undefined,
          }
        );
      }

      setProgress({ current: 0, total: 0 });
    },
    onError: (error: Error) => {
      console.error('Error in bulk approve:', error);
      toast.error(`Error: ${error.message}`);
      setProgress({ current: 0, total: 0 });
    },
  });

  return {
    bulkApprove: bulkApproveMutation.mutate,
    isApproving: bulkApproveMutation.isPending,
    progress: bulkApproveMutation.isPending ? progress : undefined,
  };
}
