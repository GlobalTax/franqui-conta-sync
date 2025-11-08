import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from './useOrganization';

export interface InvoiceReceived {
  id: string;
  supplier_id: string | null;
  centro_code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number | null;
  tax_total: number | null;
  total: number;
  status: string;
  document_path: string | null;
  entry_id: string | null;
  payment_transaction_id: string | null;
  ocr_confidence: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  supplier?: {
    id: string;
    name: string;
    tax_id: string;
  };
}

export interface InvoiceReceivedFormData {
  supplier_id: string;
  centro_code: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_total: number;
  total: number;
  status?: string;
  notes?: string;
  lines: InvoiceLineFormData[];
}

export interface InvoiceLineFormData {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_rate: number;
  account_code?: string;
}

export const useInvoicesReceived = (filters?: {
  centro_code?: string;
  supplier_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}) => {
  const { currentMembership } = useOrganization();
  const selectedCentro = currentMembership?.restaurant?.codigo;

  return useQuery({
    queryKey: ['invoices_received', filters, selectedCentro],
    queryFn: async () => {
      let query = supabase
        .from('invoices_received')
        .select(`
          *,
          supplier:suppliers(id, name, tax_id)
        `)
        .order('invoice_date', { ascending: false });

      const centroFilter = filters?.centro_code || selectedCentro;
      if (centroFilter) {
        query = query.eq('centro_code', centroFilter);
      }

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date_from) {
        query = query.gte('invoice_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('invoice_date', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InvoiceReceived[];
    },
    enabled: !!selectedCentro || !!filters?.centro_code,
  });
};

export const useCreateInvoiceReceived = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceData: InvoiceReceivedFormData) => {
      const { lines, ...invoiceFields } = invoiceData;

      // Crear la factura
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_received')
        .insert([invoiceFields])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Crear las líneas de factura
      if (lines && lines.length > 0) {
        const invoiceLines = lines.map((line, index) => {
          const discount_amount = (line.unit_price * line.quantity * (line.discount_percentage || 0)) / 100;
          const subtotal = line.unit_price * line.quantity - discount_amount;
          const tax_amount = (subtotal * line.tax_rate) / 100;
          const total = subtotal + tax_amount;

          return {
            invoice_id: invoice.id,
            invoice_type: 'received',
            line_number: index + 1,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            discount_percentage: line.discount_percentage || 0,
            discount_amount,
            subtotal,
            tax_rate: line.tax_rate,
            tax_amount,
            total,
            account_code: line.account_code,
          };
        });

        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(invoiceLines);

        if (linesError) throw linesError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      toast.success('Factura recibida creada correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear factura: ${error.message}`);
    },
  });
};

export const useUpdateInvoiceReceived = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvoiceReceivedFormData> }) => {
      const { lines, ...invoiceFields } = data;

      const { data: updated, error } = await supabase
        .from('invoices_received')
        .update(invoiceFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
      toast.success('Factura actualizada correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar factura: ${error.message}`);
    },
  });
};

export const useInvoiceLines = (invoiceId: string, invoiceType: 'received' | 'issued') => {
  return useQuery({
    queryKey: ['invoice_lines', invoiceId, invoiceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('invoice_type', invoiceType)
        .order('line_number');

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
};
