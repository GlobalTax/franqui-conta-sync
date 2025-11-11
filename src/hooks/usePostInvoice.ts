import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { JournalLine } from '@/lib/accounting/core/validators';

interface PostInvoiceParams {
  invoiceId: string;
  invoiceType: 'received' | 'issued';
  entryDate: string;
  description: string;
  centreCode: string;
  fiscalYearId: string;
  preview: JournalLine[];
}

export function usePostInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: PostInvoiceParams) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      const { data, error } = await supabase.functions.invoke('post-invoice', {
        body: {
          ...params,
          userId: userData.user.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Factura contabilizada correctamente');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
    },
    onError: (error) => {
      console.error('Error posting invoice:', error);
      toast.error('Error al contabilizar la factura');
    },
  });

  return {
    postInvoice: mutation.mutate,
    isPosting: mutation.isPending,
  };
}
