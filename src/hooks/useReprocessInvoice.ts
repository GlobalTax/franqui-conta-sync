import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { convertPdfToPngClient } from '@/lib/pdf-converter';

interface ReprocessParams {
  invoiceId: string;
  provider: 'openai' | 'mindee';
  supplierHint?: string | null;
}

export function useReprocessInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ invoiceId, provider, supplierHint }: ReprocessParams) => {
      // Get invoice file path to convert PDF if needed
      const { data: invoice } = await supabase
        .from('invoices_received')
        .select('file_path, file_name')
        .eq('id', invoiceId)
        .single();

      let imageDataUrl: string | undefined;

      // If it's a PDF, try to convert it on the client
      if (invoice?.file_path?.toLowerCase().endsWith('.pdf')) {
        try {
          // Download the PDF from storage
          const { data: fileData } = await supabase.storage
            .from('invoice-documents')
            .download(invoice.file_path);

          if (fileData) {
            console.log('[Reprocess] Converting PDF to PNG...');
            imageDataUrl = await convertPdfToPngClient(fileData as File);
            console.log('[Reprocess] ✓ PDF converted');
          }
        } catch (conversionError) {
          console.warn('[Reprocess] PDF conversion failed, will use server-side:', conversionError);
        }
      }

      const requestBody: any = {
        invoiceId,
        provider,
        reprocess: true,
        supplierHint
      };

      if (imageDataUrl) {
        requestBody.imageDataUrl = imageDataUrl;
      }

      const { data, error } = await supabase.functions.invoke('invoice-ocr', {
        body: requestBody
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Factura reprocesada correctamente');
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
    },
    onError: (error) => {
      console.error('Error reprocessing invoice:', error);
      toast.error('Error al reprocesar la factura');
    },
  });

  return {
    reprocess: mutation.mutate,
    isReprocessing: mutation.isPending,
  };
}
