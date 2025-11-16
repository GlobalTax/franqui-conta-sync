import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceFiltersPanel } from "@/components/invoices/InvoiceFiltersPanel";
import { InvoiceReviewSheet } from "@/components/invoices/InvoiceReviewSheet";
import { InboxTabs } from "@/components/invoices/inbox/InboxTabs";
import { InboxBulkActionsBar } from "@/components/invoices/inbox/InboxBulkActionsBar";
import { InboxDashboard } from "@/components/invoices/inbox/InboxDashboard";
import { InboxStatusBadge } from "@/components/invoices/inbox/InboxStatusBadge";
import { useInvoicesReceived } from "@/hooks/useInvoicesReceived";
import { useOrganization } from "@/hooks/useOrganization";
import { useBulkApprove } from "@/hooks/useBulkApprove";
import { useBulkPost } from "@/hooks/useBulkPost";
import { Search, Plus, FileStack, AlertCircle, CheckCircle, BookCheck, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { InvoiceReceived } from "@/hooks/useInvoicesReceived";

interface InvoiceFilters {
  status: string[];
  supplierId: string | null;
  centroCode: string[];
  minOcrConfidence: number;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}

export default function InvoicesReceivedOCR() {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceReceived | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: [],
    supplierId: null,
    centroCode: [],
    minOcrConfidence: 0,
    dateFrom: "",
    dateTo: "",
    searchQuery: "",
  });

  const { data: invoicesResult, isLoading } = useInvoicesReceived({
    centro_code: currentMembership?.restaurant?.codigo,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    supplier_id: filters.supplierId || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
  });

  const { bulkApprove, isApproving } = useBulkApprove();
  const { bulkPost, isPosting } = useBulkPost();

  const invoices = invoicesResult?.data || [];

  // Filter invoices by tab and filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Tab filtering
      if (activeTab === "pending") {
        if (invoice.status === "posted" || invoice.approval_status === "approved_accounting") {
          return false;
        }
      } else if (activeTab === "approved") {
        if (invoice.approval_status !== "approved_accounting" || invoice.status === "posted") {
          return false;
        }
      } else if (activeTab === "posted") {
        if (invoice.status !== "posted") return false;
      } else if (activeTab === "rejected") {
        if (invoice.approval_status !== "rejected") return false;
      }

      // OCR confidence filter
      const ocrConfidence = invoice.ocr_confidence || 0;
      if (ocrConfidence < filters.minOcrConfidence / 100) return false;

      // Centro filter
      if (filters.centroCode.length > 0 && !filters.centroCode.includes(invoice.centro_code)) {
        return false;
      }

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          invoice.invoice_number?.toLowerCase().includes(query) ||
          invoice.supplier?.name?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [invoices, activeTab, filters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const pending = invoices.filter(
      (inv) => inv.status !== "posted" && inv.approval_status !== "approved_accounting"
    ).length;
    const approved = invoices.filter(
      (inv) => inv.approval_status === "approved_accounting" && inv.status !== "posted"
    ).length;
    const posted = invoices.filter((inv) => inv.status === "posted").length;
    const rejected = invoices.filter((inv) => inv.approval_status === "rejected").length;
    
    const approvedAmount = invoices
      .filter((inv) => inv.approval_status === "approved_accounting" && inv.status !== "posted")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return {
      pendingCount: pending,
      approvedCount: approved,
      postedCount: posted,
      rejectedCount: rejected,
      approvedAmount,
    };
  }, [invoices]);

  const tabs = [
    {
      key: "pending",
      label: "Pendientes",
      icon: AlertCircle,
      count: metrics.pendingCount,
      description: "Facturas esperando revisión",
    },
    {
      key: "approved",
      label: "Aprobadas",
      icon: CheckCircle,
      count: metrics.approvedCount,
      description: "Listas para contabilizar",
    },
    {
      key: "posted",
      label: "Contabilizadas",
      icon: BookCheck,
      count: metrics.postedCount,
      description: "Ya tienen asiento contable",
    },
    {
      key: "rejected",
      label: "Rechazadas",
      icon: XCircle,
      count: metrics.rejectedCount,
      description: "Facturas rechazadas",
    },
  ];

  const handleOpenSheet = (invoice: InvoiceReceived) => {
    setSelectedInvoice(invoice);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredInvoices.map((inv) => inv.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, invoiceId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== invoiceId));
    }
  };

  const handleBulkApprove = () => {
    bulkApprove({ invoiceIds: selectedIds });
    setSelectedIds([]);
  };

  const handleBulkPost = () => {
    bulkPost({ invoiceIds: selectedIds, postingDate: new Date() });
    setSelectedIds([]);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const getOcrConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "text-muted-foreground";
    const percent = Math.round(confidence * 100);
    if (percent >= 90) return "text-green-600";
    if (percent >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        breadcrumbs={[
          { label: "Facturas", href: "/facturas" },
          { label: "Inbox de Control" },
        ]}
        title="📥 Inbox de Facturas Recibidas"
        subtitle="Revisa, aprueba y contabiliza facturas con control total"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => navigate("/invoices/bulk-upload")} variant="outline">
              <FileStack className="w-4 h-4 mr-2" />
              Carga masiva
            </Button>
            <Button onClick={() => navigate("/invoices/received/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva factura
            </Button>
          </div>
        }
      />

      <div className="container mx-auto px-6 py-6">
        {/* Dashboard de métricas */}
        <InboxDashboard metrics={metrics} />

        {/* Pestañas de estado */}
        <div className="mb-6">
          <InboxTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        </div>

        <div className="flex gap-6">
          {/* Filtros */}
          <div className="w-64 flex-shrink-0">
            <InvoiceFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              invoices={invoices}
            />
          </div>

          {/* Contenido principal */}
          <div className="flex-1">
            <Card>
              <div className="p-4 border-b flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por número o proveedor..."
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                    }
                    className="pl-9"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? "s" : ""}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === filteredInvoices.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>OCR</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No hay facturas en esta pestaña
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(invoice.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(invoice.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell onClick={() => handleOpenSheet(invoice)}>
                          {invoice.invoice_date
                            ? format(new Date(invoice.invoice_date), "dd/MM/yyyy", {
                                locale: es,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell
                          onClick={() => handleOpenSheet(invoice)}
                          className="font-medium"
                        >
                          {invoice.invoice_number || "-"}
                        </TableCell>
                        <TableCell onClick={() => handleOpenSheet(invoice)}>
                          <div>
                            <div className="font-medium">
                              {invoice.supplier?.name || "Sin proveedor"}
                            </div>
                            {invoice.supplier?.tax_id && (
                              <div className="text-xs text-muted-foreground">
                                {invoice.supplier.tax_id}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          onClick={() => handleOpenSheet(invoice)}
                          className="text-right font-medium"
                        >
                          {invoice.total?.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                          })}
                          €
                        </TableCell>
                        <TableCell onClick={() => handleOpenSheet(invoice)}>
                          {invoice.ocr_confidence ? (
                            <span
                              className={getOcrConfidenceColor(invoice.ocr_confidence)}
                            >
                              {Math.round(invoice.ocr_confidence * 100)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell onClick={() => handleOpenSheet(invoice)}>
                          <InboxStatusBadge
                            status={invoice.status}
                            hasEntry={!!invoice.entry_id}
                            ocrEngine={invoice.ocr_engine}
                            ocrConfidence={invoice.ocr_confidence}
                            approvalStatus={invoice.approval_status}
                            mindeeConfidence={invoice.mindee_confidence}
                            ocrFallbackUsed={invoice.ocr_fallback_used}
                          />
                        </TableCell>
                        <TableCell onClick={() => handleOpenSheet(invoice)}>
                          <Badge variant="outline">{invoice.centro_code}</Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenSheet(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </div>

      {/* Barra de acciones masivas */}
      <InboxBulkActionsBar
        selectedCount={selectedIds.length}
        activeTab={activeTab}
        onApprove={handleBulkApprove}
        onPost={handleBulkPost}
        onClear={handleClearSelection}
        isLoading={isApproving || isPosting}
      />

      {/* Sheet de revisión */}
      <InvoiceReviewSheet
        invoice={selectedInvoice}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClose={handleCloseSheet}
      />
    </div>
  );
}
