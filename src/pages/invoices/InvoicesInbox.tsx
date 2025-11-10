import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { InvoiceInboxTable } from '@/components/invoices/inbox/InvoiceInboxTable';
import { InvoiceInboxSidebar } from '@/components/invoices/inbox/InvoiceInboxSidebar';
import { InboxTopFilters } from '@/components/invoices/inbox/InboxTopFilters';
import { InboxEmptyState } from '@/components/invoices/inbox/InboxEmptyState';
import { InboxPDFActionsBar } from '@/components/invoices/inbox/InboxPDFActionsBar';
import { SplitDocumentDialog } from '@/components/invoices/inbox/dialogs/SplitDocumentDialog';
import { MergeDocumentsDialog } from '@/components/invoices/inbox/dialogs/MergeDocumentsDialog';
import { BulkPostDialog } from '@/components/invoices/inbox/dialogs/BulkPostDialog';
import { ReprocessOCRSimpleDialog } from '@/components/invoices/inbox/ReprocessOCRSimpleDialog';
import { usePDFOperations } from '@/hooks/usePDFOperations';
import { useBulkPost } from '@/hooks/useBulkPost';
import { InboxAssignCentreDialog } from '@/components/invoices/inbox/InboxAssignCentreDialog';
import { InboxSearchDialog } from '@/components/invoices/inbox/InboxSearchDialog';
import { useInvoicesReceived, type InvoiceReceived } from '@/hooks/useInvoicesReceived';
import { useInvoiceHotkeys } from '@/hooks/useInvoiceHotkeys';
import { useInvoiceReview } from '@/hooks/useInvoiceReview';
import { useBulkInvoiceActions } from '@/hooks/useBulkInvoiceActions';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  document_type: 'invoice' as const,
  
  // 🔴 Sprint 3: Nuevos campos críticos
  invoice_type: (inv.invoice_type || 'received') as 'received' | 'issued',
  file_name: inv.document_path?.split('/').pop() || inv.invoice_number || 'sin_nombre.pdf',
  created_at: inv.created_at,
  posted: !!inv.entry_id,
  file_size_kb: inv.file_size_kb,
  page_count: inv.page_count,
  
  // Campos OCR reales
  ocr_engine: inv.ocr_engine,
  ocr_confidence: inv.ocr_confidence,
  processing_time_ms: inv.ocr_processing_time_ms,
  ocr_ms_openai: inv.ocr_ms_openai,
  ocr_ms_mindee: inv.ocr_ms_mindee,
  ocr_pages: inv.ocr_pages,
  ocr_tokens_in: inv.ocr_tokens_in,
  ocr_tokens_out: inv.ocr_tokens_out,
  ocr_cost_estimate_eur: inv.ocr_cost_estimate_eur,
  ocr_confidence_notes: inv.ocr_confidence_notes,
  ocr_merge_notes: inv.ocr_merge_notes,
});

export default function InvoicesInbox() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Determinar tab activo basado en la ruta
  const activeTab = useMemo(() => {
    if (location.pathname.includes('/depura')) return 'depura';
    if (location.pathname.includes('/papelera')) return 'papelera';
    return 'recibidos';
  }, [location.pathname]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    status?: string;
    supplier_id?: string;
    centro_code?: string;
    date_from?: string;
    date_to?: string;
    searchTerm?: string;
    ocr_engine?: string;
    posted?: boolean | null;
    invoice_type?: 'received' | 'issued' | null;
    data_quality?: 'with_ocr' | 'without_ocr' | 'errors' | null;
  }>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compactView, setCompactView] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
  const [invoiceToReprocess, setInvoiceToReprocess] = useState<string | null>(null);
  const [selectedInvoiceForSplit, setSelectedInvoiceForSplit] = useState<any | null>(null);
  
  const { splitPDF, mergePDF, isLoading: isPDFLoading } = usePDFOperations();
  const { bulkPost, isPosting, progress } = useBulkPost();
  const invoiceActions = useInvoiceActions();
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

  const selectedInvoices = result?.data?.filter(inv => selectedIds.includes(inv.id)) || [];

  const canSplit = selectedIds.length === 1 && selectedInvoices[0]?.ocr_pages && selectedInvoices[0].ocr_pages > 1;
  const canMerge = selectedIds.length >= 2;
  const canPost = selectedInvoices.length > 0 && selectedInvoices.every(inv => inv.approval_status === 'approved_accounting' && inv.centro_code && !inv.entry_id);

  const handleSplitDocument = () => {
    if (!canSplit) return toast.error('Selecciona una factura multipágina');
    setSelectedInvoiceForSplit(selectedInvoices[0]);
    setSplitDialogOpen(true);
  };

  const handleSplitConfirm = (splits: any[]) => {
    if (!selectedInvoiceForSplit) return;
    splitPDF({ invoiceId: selectedInvoiceForSplit.id, documentPath: selectedInvoiceForSplit.document_path || '', splits }, {
      onSuccess: () => { setSplitDialogOpen(false); setSelectedIds([]); setSelectedInvoiceForSplit(null); }
    });
  };

  const handleMergeDocuments = () => {
    if (!canMerge) return toast.error('Selecciona al menos 2 facturas');
    setMergeDialogOpen(true);
  };

  const handleMergeConfirm = (primaryInvoiceId: string, order: string[]) => {
    mergePDF({ invoiceIds: selectedIds, primaryInvoiceId, order }, {
      onSuccess: () => { setMergeDialogOpen(false); setSelectedIds([]); }
    });
  };

  const handleBulkPost = () => {
    if (!canPost) return toast.error('Algunas facturas no cumplen requisitos');
    setPostDialogOpen(true);
  };

  const handlePostConfirm = (postingDate: Date) => {
    bulkPost({ invoiceIds: selectedIds, postingDate }, {
      onSuccess: () => { setPostDialogOpen(false); setSelectedIds([]); }
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedIds.length} factura(s)?`)) return;
    try {
      for (const id of selectedIds) {
        const invoice = result?.data?.find(inv => inv.id === id);
        if (invoice?.document_path) await supabase.storage.from('invoice-documents').remove([invoice.document_path]);
        await supabase.from('invoices_received').delete().eq('id', id);
      }
      toast.success(`${selectedIds.length} factura(s) eliminadas`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handler para reintentar OCR
  const handleRetryOCR = (invoiceId: string) => {
    setInvoiceToReprocess(invoiceId);
    setReprocessDialogOpen(true);
  };

  const handleReprocessConfirm = async (engine: 'openai' | 'mindee') => {
    if (!invoiceToReprocess) return;
    
    await invoiceActions.reprocessOCR({
      invoiceId: invoiceToReprocess,
      engine
    });
    
    setReprocessDialogOpen(false);
    setInvoiceToReprocess(null);
  };

  const handleNewInvoice = () => {
    navigate('/invoices/new-received');
  };

  const handleEdit = (invoiceId: string) => {
    navigate(`/invoices/received/${invoiceId}/edit`);
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('¿Eliminar esta factura?')) return;
    try {
      const invoice = result?.data?.find(inv => inv.id === invoiceId);
      if (invoice?.document_path) {
        await supabase.storage.from('invoice-documents').remove([invoice.document_path]);
      }
      await supabase.from('invoices_received').delete().eq('id', invoiceId);
      toast.success('Factura eliminada');
      queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
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
        <h1 className="text-2xl font-heading font-bold">Digitalización de Documentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestión de facturas y documentos OCR
        </p>
      </div>

      {/* Tabs superiores */}
      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'intro') navigate('/digitalizacion/inbox');
        if (value === 'recibidos') navigate('/digitalizacion/inbox');
        if (value === 'depura') navigate('/digitalizacion/depura');
        if (value === 'papelera') navigate('/digitalizacion/papelera');
      }} className="border-b">
        <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0 px-6">
          <TabsTrigger 
            value="intro" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Introducción
          </TabsTrigger>
          <TabsTrigger 
            value="recibidos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Doc. Recibidos
          </TabsTrigger>
          <TabsTrigger 
            value="depura"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            OCR Depura
          </TabsTrigger>
          <TabsTrigger 
            value="papelera"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Papelera
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Subtítulo con conteo */}
      <div className="bg-background px-6 py-3 border-b">
        <p className="text-sm text-muted-foreground">
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
      <InboxTopFilters
        filters={filters}
        onFiltersChange={setFilters}
        onApply={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices_received'] });
        }}
        compactView={compactView}
        onCompactViewChange={setCompactView}
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
              compact={compactView}
              onRetryOCR={handleRetryOCR}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
      <InboxPDFActionsBar
        selectedCount={selectedIds.length}
        selectedInvoices={selectedInvoices}
        canSplit={canSplit}
        canMerge={canMerge}
        canPost={canPost}
        onDeselect={() => setSelectedIds([])}
        onSplit={handleSplitDocument}
        onMerge={handleMergeDocuments}
        onPost={handleBulkPost}
        onDelete={handleBulkDelete}
        onNew={handleNewInvoice}
        showNewButton={true}
        isLoading={isPDFLoading || isPosting}
      />

      <SplitDocumentDialog
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        invoice={selectedInvoiceForSplit}
        onConfirm={handleSplitConfirm}
        isLoading={isPDFLoading}
      />

      <MergeDocumentsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        invoices={selectedInvoices}
        onConfirm={handleMergeConfirm}
        isLoading={isPDFLoading}
      />

      <BulkPostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        invoices={selectedInvoices}
        onConfirm={handlePostConfirm}
        isLoading={isPosting}
        progress={progress}
      />

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

      {/* Diálogo de reprocesar OCR */}
      <ReprocessOCRSimpleDialog
        open={reprocessDialogOpen}
        onOpenChange={setReprocessDialogOpen}
        invoiceId={invoiceToReprocess || ''}
        onConfirm={handleReprocessConfirm}
        isLoading={invoiceActions.isReprocessing}
      />
    </div>
  );
}
