import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices_received')
        .select(`
          id,
          centro_code,
          supplier_id,
          supplier_name,
          supplier_tax_id,
          invoice_number,
          invoice_date,
          due_date,
          subtotal,
          tax_total,
          total,
          status,
          approval_status,
          requires_manager_approval,
          requires_accounting_approval,
          rejected_at,
          rejected_by,
          rejected_reason,
          entry_id,
          payment_transaction_id,
          file_path,
          ocr_confidence,
          ocr_payload,
          ocr_engine_used,
          notes,
          created_at,
          updated_at,
          created_by
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
}
