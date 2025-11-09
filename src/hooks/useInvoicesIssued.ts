import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from './useOrganization';
import { 
  getInvoicesIssued, 
  getNextInvoiceNumber
} from '@/infrastructure/persistence/supabase/queries/InvoiceQueries';
import type { InvoiceFilters } from '@/domain/invoicing/types';

export interface InvoiceIssued {
  id: string;
  centro_code: string;
  customer_name: string;
  customer_tax_id: string | null;
  customer_email: string | null;
  customer_address: string | null;
  invoice_series: string;
  invoice_number: number;
  full_invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number | null;
  tax_total: number | null;
  total: number;
  status: string;
  entry_id: string | null;
  payment_transaction_id: string | null;
  pdf_path: string | null;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface InvoiceIssuedFormData {
  centro_code: string;
  customer_name: string;
  customer_tax_id?: string;
  customer_email?: string;
  customer_address?: string;
  invoice_series?: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_total: number;
  total: number;
  status?: string;
  notes?: string;
  lines: {
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    tax_rate: number;
    account_code?: string;
  }[];
}

export const useInvoicesIssued = (filters?: {
  centro_code?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}) => {
  const { currentMembership } = useOrganization();
  const selectedCentro = currentMembership?.restaurant?.codigo;

  return useQuery({
    queryKey: ['invoices_issued', filters, selectedCentro],
    queryFn: async () => {
      const centroFilter = filters?.centro_code || selectedCentro;
      
      const queryFilters: Omit<InvoiceFilters, 'supplierId' | 'approvalStatus'> = {
        centroCode: centroFilter,
        status: filters?.status as any,
        dateFrom: filters?.date_from,
        dateTo: filters?.date_to,
      };

      const domainInvoices = await getInvoicesIssued(queryFilters);

      // Convertir de camelCase (dominio) a snake_case (API legacy)
      return domainInvoices.map(inv => ({
        id: inv.id,
        centro_code: inv.centroCode,
        customer_name: inv.customerName,
        customer_tax_id: inv.customerTaxId,
        customer_email: inv.customerEmail,
        customer_address: inv.customerAddress,
        invoice_series: inv.invoiceSeries,
        invoice_number: inv.invoiceNumber,
        full_invoice_number: inv.fullInvoiceNumber,
        invoice_date: inv.invoiceDate,
        due_date: inv.dueDate,
        subtotal: inv.subtotal,
        tax_total: inv.taxTotal,
        total: inv.total,
        status: inv.status,
        entry_id: inv.entryId,
        payment_transaction_id: inv.paymentTransactionId,
        pdf_path: inv.pdfPath,
        sent_at: inv.sentAt,
        paid_at: inv.paidAt,
        notes: inv.notes,
        created_at: inv.createdAt,
        updated_at: inv.updatedAt,
        created_by: inv.createdBy,
      })) as InvoiceIssued[];
    },
    enabled: !!selectedCentro || !!filters?.centro_code,
  });
};

export const useGetNextInvoiceNumber = () => {
  return useMutation({
    mutationFn: async ({ centro_code, series }: { centro_code: string; series: string }) => {
      return await getNextInvoiceNumber(centro_code, series);
    },
  });
};

export const useCreateInvoiceIssued = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceData: InvoiceIssuedFormData) => {
      const { lines, ...invoiceFields } = invoiceData;

      // Obtener el siguiente número de factura
      const year = new Date().getFullYear();
      const series = invoiceFields.invoice_series || 'A';

      const { data: sequence, error: seqError } = await supabase
        .from('invoice_sequences')
        .select('*')
        .eq('centro_code', invoiceFields.centro_code)
        .eq('invoice_type', 'issued')
        .eq('series', series)
        .eq('year', year)
        .single();

      let nextNumber = 1;
      if (sequence) {
        nextNumber = sequence.last_number + 1;
      } else {
        // Crear secuencia
        await supabase
          .from('invoice_sequences')
          .insert([{
            centro_code: invoiceFields.centro_code,
            invoice_type: 'issued',
            series,
            year,
            last_number: 0,
          }]);
      }

      // Crear la factura
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_issued')
        .insert([{
          ...invoiceFields,
          invoice_number: nextNumber,
          invoice_series: series,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Actualizar la secuencia
      await supabase
        .from('invoice_sequences')
        .update({ last_number: nextNumber })
        .eq('centro_code', invoiceFields.centro_code)
        .eq('invoice_type', 'issued')
        .eq('series', series)
        .eq('year', year);

      // Crear las líneas de factura
      if (lines && lines.length > 0) {
        const invoiceLines = lines.map((line, index) => {
          const discount_amount = (line.unit_price * line.quantity * (line.discount_percentage || 0)) / 100;
          const subtotal = line.unit_price * line.quantity - discount_amount;
          const tax_amount = (subtotal * line.tax_rate) / 100;
          const total = subtotal + tax_amount;

          return {
            invoice_id: invoice.id,
            invoice_type: 'issued',
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
      queryClient.invalidateQueries({ queryKey: ['invoices_issued'] });
      queryClient.invalidateQueries({ queryKey: ['invoice_sequences'] });
      toast.success('Factura emitida creada correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear factura: ${error.message}`);
    },
  });
};

export const useUpdateInvoiceIssued = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvoiceIssuedFormData> }) => {
      const { lines, ...invoiceFields } = data;

      const { data: updated, error } = await supabase
        .from('invoices_issued')
        .update(invoiceFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_issued'] });
      toast.success('Factura actualizada correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar factura: ${error.message}`);
    },
  });
};
