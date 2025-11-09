import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceInboxTable } from '@/components/invoices/inbox/InvoiceInboxTable';
import { InvoiceInboxSidebar } from '@/components/invoices/inbox/InvoiceInboxSidebar';
import { InboxFiltersBar } from '@/components/invoices/inbox/InboxFiltersBar';
import { InboxEmptyState } from '@/components/invoices/inbox/InboxEmptyState';
import { InboxBulkActions } from '@/components/invoices/inbox/InboxBulkActions';
import { InboxSearchDialog } from '@/components/invoices/inbox/InboxSearchDialog';
import { useInvoicesReceived, type InvoiceReceived } from '@/hooks/useInvoicesReceived';
import { useInvoiceHotkeys } from '@/hooks/useInvoiceHotkeys';
import { useInvoiceReview } from '@/hooks/useInvoiceReview';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
  const [filters, setFilters] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch invoices
  const { data: rawInvoices = [], isLoading } = useInvoicesReceived(filters);
  
  // Transform invoices for table
  const invoices = useMemo(() => rawInvoices.map(transformInvoice), [rawInvoices]);
  
  // Review actions
  const { assignCentre, generateEntry } = useInvoiceReview(selectedInvoiceId);

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
    toast.success(`${selectedIds.length} facturas aprobadas`);
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    toast.error(`${selectedIds.length} facturas rechazadas`);
    setSelectedIds([]);
  };

  const handleBulkAssignCentre = () => {
    toast.info('Asignar centro a facturas seleccionadas');
    // TODO: Abrir diálogo para asignar centro
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
          <InvoiceInboxTable
            invoices={invoices}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onRowClick={handleRowClick}
            loading={isLoading}
          />
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
    </div>
  );
}
