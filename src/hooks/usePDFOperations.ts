// ============================================================================
// HOOK: usePDFOperations
// Operaciones de manipulación de PDFs (split/merge)
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SplitPDFParams {
  invoiceId: string;
  documentPath: string;
  splits: Array<{
    from_page: number;
    to_page: number;
    name: string;
  }>;
}

interface MergePDFParams {
  invoiceIds: string[];
  primaryInvoiceId: string;
  order: string[];
}

export function usePDFOperations() {
  const queryClient = useQueryClient();

  const splitPDFMutation = useMutation({
    mutationFn: async ({ invoiceId, documentPath, splits }: SplitPDFParams) => {
      const { data, error } = await supabase.functions.invoke('split-pdf', {
        body: {
          invoice_id: invoiceId,
          document_path: documentPath,
          splits,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error al dividir PDF');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      toast.success(data.message || `PDF dividido en ${data.new_invoices.length} facturas`, {
        description: 'Las nuevas facturas están pendientes de aprobación',
      });
    },
    onError: (error: Error) => {
      console.error('Error splitting PDF:', error);
      toast.error(`Error al dividir PDF: ${error.message}`);
    },
  });

  const mergePDFMutation = useMutation({
    mutationFn: async ({ invoiceIds, primaryInvoiceId, order }: MergePDFParams) => {
      const { data, error } = await supabase.functions.invoke('merge-pdf', {
        body: {
          invoice_ids: invoiceIds,
          primary_invoice_id: primaryInvoiceId,
          order,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error al fusionar PDFs');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      toast.success(data.message || 'PDFs fusionados correctamente', {
        description: `${data.total_pages} páginas en total`,
      });
    },
    onError: (error: Error) => {
      console.error('Error merging PDFs:', error);
      toast.error(`Error al fusionar PDFs: ${error.message}`);
    },
  });

  return {
    splitPDF: splitPDFMutation.mutate,
    mergePDF: mergePDFMutation.mutate,
    isSplitting: splitPDFMutation.isPending,
    isMerging: mergePDFMutation.isPending,
    isLoading: splitPDFMutation.isPending || mergePDFMutation.isPending,
  };
}
