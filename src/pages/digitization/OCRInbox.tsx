// ============================================================================
// OCR INBOX PAGE
// Bandeja unificada para procesamiento de facturas con OCR
// ============================================================================

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { OCRFilters } from "@/components/digitization/OCRFilters";
import { OCRTable } from "@/components/digitization/OCRTable";
import { OCRBottomBar } from "@/components/digitization/OCRBottomBar";
import { useInvoicesReceived } from "@/hooks/useInvoicesReceived";
import { useOrganization } from "@/hooks/useOrganization";
import { Inbox } from "lucide-react";
import type { InvoiceReceived } from "@/hooks/useInvoicesReceived";

export interface OCRFiltersState {
  status: string[];
  supplierId: string | null;
  centroCode: string[];
  minOcrConfidence: number;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}

export default function OCRInbox() {
  const { currentMembership } = useOrganization();
  
  const [filters, setFilters] = useState<OCRFiltersState>({
    status: [],
    supplierId: null,
    centroCode: [],
    minOcrConfidence: 0,
    dateFrom: "",
    dateTo: "",
    searchQuery: "",
  });

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Fetch invoices
  const { data: invoicesResult, isLoading, refetch } = useInvoicesReceived({
    centro_code: currentMembership?.restaurant?.codigo,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    supplier_id: filters.supplierId || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
  });

  const invoices = invoicesResult?.data || [];

  // Apply client-side filters
  const filteredInvoices = invoices.filter((invoice: InvoiceReceived) => {
    const ocrConfidence = invoice.ocr_confidence || 0;
    if (ocrConfidence < filters.minOcrConfidence / 100) return false;

    if (filters.centroCode.length > 0 && !filters.centroCode.includes(invoice.centro_code)) {
      return false;
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return (
        invoice.invoice_number?.toLowerCase().includes(query) ||
        invoice.supplier?.name?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleSelectionChange = (ids: string[]) => {
    setSelectedInvoiceIds(ids);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        breadcrumbs={[
          { label: "Digitalización", href: "/digitalizacion" },
          { label: "Inbox OCR" },
        ]}
        title="Inbox OCR"
        subtitle="Bandeja de procesamiento automático de facturas"
      />

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <OCRFilters 
              value={filters} 
              onApply={setFilters}
              invoices={invoices}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <OCRTable
              rows={filteredInvoices}
              isLoading={isLoading}
              onSelectionChange={handleSelectionChange}
            />
          </main>
        </div>

        {/* Bottom Bar */}
        {selectedInvoiceIds.length > 0 && (
          <OCRBottomBar 
            selectedIds={selectedInvoiceIds}
            onClear={() => setSelectedInvoiceIds([])}
            onSuccess={() => {
              setSelectedInvoiceIds([]);
              refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}
