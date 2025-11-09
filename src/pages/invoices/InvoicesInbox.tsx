import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceInboxTable } from '@/components/invoices/inbox/InvoiceInboxTable';
import { InvoiceInboxSidebar } from '@/components/invoices/inbox/InvoiceInboxSidebar';
import { InboxFiltersBar } from '@/components/invoices/inbox/InboxFiltersBar';
import { InboxEmptyState } from '@/components/invoices/inbox/InboxEmptyState';
import { InboxBulkActions } from '@/components/invoices/inbox/InboxBulkActions';
import { InboxAssignCentreDialog } from '@/components/invoices/inbox/InboxAssignCentreDialog';
import { InboxSearchDialog } from '@/components/invoices/inbox/InboxSearchDialog';
import { useInvoicesReceived, type InvoiceReceived } from '@/hooks/useInvoicesReceived';
import { useInvoiceHotkeys } from '@/hooks/useInvoiceHotkeys';
import { useInvoiceReview } from '@/hooks/useInvoiceReview';
import { useBulkInvoiceActions } from '@/hooks/useBulkInvoiceActions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

// Transform invoice data to match table interface
const transformInvoice = (inv: InvoiceReceived) => ({
  id: inv.id,
  supplier_name: inv.supplier?.name || 'Desconocido',
  supplier_tax_id: inv.supplier?.tax_id,
  invoice_date: inv.invoice_date,
  invoice_number: inv.invoice_number,
  total_amount: inv.total || 0,
  base_amount: inv.subtotal,
  tax_amount: inv.tax_total,
  status: inv.approval_status || inv.status,
  centro_code: inv.centro_code,
  accounting_entry_id: inv.entry_id,
  iva_percentage: inv.tax_total && inv.subtotal ? ((inv.tax_total / inv.subtotal) * 100) : undefined,
});

export default function InvoicesInbox() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    status?: string;
    supplier_id?: string;
    centro_code?: string;
    date_from?: string;
    date_to?: string;
    searchTerm?: string;
  }>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assignCentreDialogOpen, setAssignCentreDialogOpen] = useState(false);

  // Fetch invoices con paginación
  const { data: result, isLoading } = useInvoicesReceived({ ...filters, page, limit: 50 });
  
  // Transform invoices for table
  const invoices = useMemo(() => (result?.data || []).map(transformInvoice), [result]);
  const totalInvoices = result?.total || 0;
  const totalPages = result?.pageCount || 1;
  
  // Review actions
  const { assignCentre, generateEntry } = useInvoiceReview(selectedInvoiceId);
  
  // Bulk actions
  const { bulkAssignCentre, bulkApprove, bulkReject, isLoading: isBulkLoading } = useBulkInvoiceActions();

  // Contar filtros activos
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(
      (key) => filters[key] !== undefined && filters[key] !== ''
    ).length;
  }, [filters]);

  // Hotkeys
  useInvoiceHotkeys({
    onSearch: () => setSearchOpen(true),
    onClose: () => setSidebarOpen(false),
    onNew: () => navigate('/invoices/new-received'),
    enabled: true,
  });

  const handleRowClick = (invoice: any) => {
    setSelectedInvoiceId(invoice.id);
    setSidebarOpen(true);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleApprove = (id: string) => {
    toast.success('Factura aprobada correctamente');
    // TODO: Implementar lógica de aprobación
  };

  const handleReject = (id: string) => {
    toast.error('Factura rechazada');
    // TODO: Implementar lógica de rechazo
  };

  const handleAssignCentre = (id: string, centroCode: string) => {
    assignCentre({ invoiceId: id, centroCode });
  };

  const handleGenerateEntry = (id: string) => {
    generateEntry(id);
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    bulkApprove({ invoiceIds: selectedIds });
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    const reason = prompt('Motivo del rechazo masivo:');
    if (!reason || reason.trim() === '') {
      toast.error('Debe proporcionar un motivo de rechazo');
      return;
    }
    bulkReject({ invoiceIds: selectedIds, reason: reason.trim() });
    setSelectedIds([]);
  };

  const handleBulkAssignCentre = () => {
    setAssignCentreDialogOpen(true);
  };

  // Determinar estado vacío
  const getEmptyVariant = () => {
    if (invoices.length === 0 && activeFilterCount === 0) {
      return 'no-invoices';
    }
    if (invoices.length === 0 && activeFilterCount > 0) {
      return 'no-results';
    }
    return 'all-processed';
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <h1 className="text-2xl font-heading font-bold">Inbox Facturas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando facturas...
            </span>
          ) : (
            `${invoices.length} factura${invoices.length !== 1 ? 's' : ''} ${
              activeFilterCount > 0 ? 'filtradas' : 'en tu bandeja'
            }`
          )}
        </p>
      </div>

      {/* Filtros */}
      <InboxFiltersBar
        filters={filters}
        onChange={setFilters}
        activeCount={activeFilterCount}
      />

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto">
        {invoices.length === 0 ? (
          <InboxEmptyState
            variant={getEmptyVariant()}
            onClearFilters={handleClearFilters}
            onNewInvoice={() => navigate('/invoices/new-received')}
          />
        ) : (
          <>
            <InvoiceInboxTable
              invoices={invoices}
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onRowClick={handleRowClick}
              loading={isLoading}
            />
            
            {/* Controles de paginación */}
            <div className="sticky bottom-0 border-t bg-background px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {invoices.length} de {totalInvoices} factura{totalInvoices !== 1 ? 's' : ''}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      setSelectedIds([]);
                    }}
                    disabled={page === 1 || isLoading}
                  >
                    Primera
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage(p => Math.max(1, p - 1));
                      setSelectedIds([]);
                    }}
                    disabled={page === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  
                  <span className="text-sm px-2">
                    Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span>
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage(p => Math.min(totalPages, p + 1));
                      setSelectedIds([]);
                    }}
                    disabled={page === totalPages || isLoading}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage(totalPages);
                      setSelectedIds([]);
                    }}
                    disabled={page === totalPages || isLoading}
                  >
                    Última
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Acciones masivas */}
      {selectedIds.length > 0 && (
        <InboxBulkActions
          count={selectedIds.length}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
          onAssignCentre={handleBulkAssignCentre}
          onDeselect={() => setSelectedIds([])}
        />
      )}

      {/* Panel lateral */}
      <InvoiceInboxSidebar
        invoiceId={selectedInvoiceId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        onAssignCentre={handleAssignCentre}
        onGenerateEntry={handleGenerateEntry}
      />

      {/* Búsqueda rápida */}
      <InboxSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        invoices={invoices}
        onSelect={(id) => {
          setSelectedInvoiceId(id);
          setSidebarOpen(true);
        }}
      />

      {/* Diálogo de asignación masiva de centro */}
      <InboxAssignCentreDialog
        open={assignCentreDialogOpen}
        onOpenChange={setAssignCentreDialogOpen}
        selectedIds={selectedIds}
        onAssigned={() => setSelectedIds([])}
      />
    </div>
  );
}
