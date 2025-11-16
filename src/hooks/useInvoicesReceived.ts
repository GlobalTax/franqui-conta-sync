import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from './useOrganization';
import { InvoiceQueries } from '@/infrastructure/persistence/supabase/queries/InvoiceQueries';
import type { InvoiceFilters } from '@/domain/invoicing/types';

// Tipos exportados para retrocompatibilidad (mapeo snake_case → camelCase)
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
  // Campos OCR detallados
  ocr_engine: 'openai' | 'mindee' | 'merged' | 'manual_review' | null;
  ocr_ms_openai: number | null;
  ocr_pages: number | null;
  ocr_tokens_in: number | null;
  ocr_tokens_out: number | null;
  ocr_cost_estimate_eur: number | null;
  ocr_processing_time_ms: number | null;
  ocr_confidence_notes: string[] | null;
  ocr_merge_notes: string[] | null;
  ocr_extracted_data: any | null;
  notes: string | null;
  approval_status: string;
  requires_manager_approval: boolean;
  requires_accounting_approval: boolean;
  rejected_by: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  
  // Campos Mindee
  mindee_document_id?: string | null;
  mindee_confidence?: number | null;
  mindee_cost_euros?: number | null;
  mindee_processing_time?: number | null;
  mindee_pages?: number | null;
  ocr_fallback_used?: boolean | null;
  field_confidence_scores?: Record<string, number> | null;
  
  // 🔴 Sprint 3: Nuevos campos críticos
  invoice_type?: 'received' | 'issued';
  file_size_kb?: number;
  page_count?: number;
  supplier?: {
    id: string;
    name: string;
    tax_id: string;
  };
  approvals?: Array<{
    id: string;
    approver_id: string;
    approval_level: string;
    action: string;
    comments: string | null;
    created_at: string;
  }>;
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
  document_path?: string | null;
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
  searchTerm?: string;
  ocr_engine?: string;
  page?: number;
  limit?: number;
}) => {
  const { currentMembership } = useOrganization();
  const selectedCentro = currentMembership?.restaurant?.codigo;

  return useQuery({
    queryKey: ['invoices_received', filters, selectedCentro],
    queryFn: async () => {
      const centroFilter = filters?.centro_code || selectedCentro;
      
      const queryFilters: InvoiceFilters = {
        centroCode: centroFilter,
        supplierId: filters?.supplier_id,
        status: filters?.status as any,
        dateFrom: filters?.date_from,
        dateTo: filters?.date_to,
        searchTerm: filters?.searchTerm,
        page: filters?.page || 1,
        limit: filters?.limit || 50,
      };

      const result = await InvoiceQueries.findInvoicesReceived(queryFilters);

      // Convertir de camelCase (dominio) a snake_case (API legacy)
      const mappedInvoices = result.data.map(inv => ({
        id: inv.id,
        supplier_id: inv.supplierId,
        centro_code: inv.centroCode,
        invoice_number: inv.invoiceNumber,
        invoice_date: inv.invoiceDate,
        due_date: inv.dueDate,
        subtotal: inv.subtotal,
        tax_total: inv.taxTotal,
        total: inv.total,
        status: inv.status,
        document_path: inv.documentPath,
        entry_id: inv.entryId,
        payment_transaction_id: inv.paymentTransactionId,
        ocr_confidence: inv.ocrConfidence,
        // Campos OCR
        ocr_engine: inv.ocrEngine,
        ocr_ms_openai: inv.ocrMsOpenai,
        ocr_pages: inv.ocrPages,
        ocr_tokens_in: inv.ocrTokensIn,
        ocr_tokens_out: inv.ocrTokensOut,
        ocr_cost_estimate_eur: inv.ocrCostEstimateEur,
        ocr_processing_time_ms: inv.ocrProcessingTimeMs,
        ocr_confidence_notes: inv.ocrConfidenceNotes,
        ocr_merge_notes: inv.ocrMergeNotes,
        ocr_extracted_data: inv.ocrExtractedData,
        notes: inv.notes,
        approval_status: inv.approvalStatus,
        requires_manager_approval: inv.requiresManagerApproval,
        requires_accounting_approval: inv.requiresAccountingApproval,
        rejected_by: inv.rejectedBy,
        rejected_at: inv.rejectedAt,
        rejected_reason: inv.rejectedReason,
        created_at: inv.createdAt,
        updated_at: inv.updatedAt,
        created_by: inv.createdBy,
        
        // 🔴 Sprint 3: Nuevos campos (derivados en frontend)
        invoice_type: 'received' as const,
        file_size_kb: undefined, // TODO: agregar si existe en dominio
        page_count: inv.ocrPages, // Usar ocr_pages como page_count
        
        supplier: inv.supplier ? {
          id: inv.supplier.id,
          name: inv.supplier.name,
          tax_id: inv.supplier.taxId,
        } : undefined,
        approvals: inv.approvals?.map(a => ({
          id: a.id,
          invoice_id: a.invoiceId,
          approver_id: a.approverId,
          approval_level: a.approvalLevel,
          action: a.action,
          comments: a.comments,
          created_at: a.createdAt,
        })),
      })) as InvoiceReceived[];

      // Filtrado client-side adicional (supplier.name, supplier.tax_id, ocr_engine)
      let filteredInvoices = mappedInvoices;

      if (filters?.searchTerm) {
        const q = filters.searchTerm.toLowerCase().trim();
        filteredInvoices = filteredInvoices.filter(inv => {
          const matchesNumber = inv.invoice_number?.toLowerCase().includes(q);
          const matchesSupplier = inv.supplier?.name?.toLowerCase().includes(q);
          const matchesTaxId = inv.supplier?.tax_id?.toLowerCase().includes(q);
          return matchesNumber || matchesSupplier || matchesTaxId;
        });
      }

      // Filtrar por motor OCR
      if (filters?.ocr_engine && filters.ocr_engine !== 'all') {
        filteredInvoices = filteredInvoices.filter(inv => inv.ocr_engine === filters.ocr_engine);
      }

      // Si hay filtros client-side activos, devolver datos filtrados
      if (filters?.searchTerm || (filters?.ocr_engine && filters.ocr_engine !== 'all')) {
        return {
          data: filteredInvoices,
          total: filteredInvoices.length,
          page: result.page,
          pageCount: Math.ceil(filteredInvoices.length / queryFilters.limit),
        };
      }

      return {
        data: mappedInvoices,
        total: result.total,
        page: result.page,
        pageCount: result.pageCount,
      };
    },
    enabled: !!selectedCentro || !!filters?.centro_code,
    // ✅ OPTIMIZACIÓN: Caché de 2 minutos para datos transaccionales
    staleTime: 2 * 60 * 1000,       // 2 minutos
    gcTime: 5 * 60 * 1000,          // 5 minutos en memoria
    refetchOnWindowFocus: true,     // Sí refetch (detectar cambios de otros usuarios)
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
      const domainLines = await InvoiceQueries.getInvoiceLines(invoiceId, invoiceType);
      
      // Convertir de camelCase (dominio) a snake_case (API legacy)
      return domainLines.map(line => ({
        id: line.id,
        invoice_id: line.invoiceId,
        invoice_type: line.invoiceType,
        line_number: line.lineNumber,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        discount_percentage: line.discountPercentage,
        discount_amount: line.discountAmount,
        subtotal: line.subtotal,
        tax_rate: line.taxRate,
        tax_amount: line.taxAmount,
        total: line.total,
        account_code: line.accountCode,
      }));
    },
    enabled: !!invoiceId,
  });
};
