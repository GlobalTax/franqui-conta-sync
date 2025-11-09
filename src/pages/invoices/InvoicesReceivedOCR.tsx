import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ApprovalStatusBadge } from "@/components/invoices/ApprovalStatusBadge";
import { useInvoicesReceived } from "@/hooks/useInvoicesReceived";
import { useOrganization } from "@/hooks/useOrganization";
import { Search, Plus, Building2, Eye } from "lucide-react";
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
  
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceReceived | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const invoices = invoicesResult?.data || [];

  const handleOpenSheet = (invoice: InvoiceReceived) => {
    setSelectedInvoice(invoice);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  // Filter invoices by OCR confidence and search query
  const filteredInvoices = invoices.filter((invoice) => {
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
          { label: "Recibidas OCR" },
        ]}
        title="Facturas Recibidas con OCR"
        subtitle="Revisa y aprueba facturas procesadas automáticamente"
        actions={
          <Button onClick={() => navigate("/facturas/nueva-ocr")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva con OCR
          </Button>
        }
      />

      <div className="container mx-auto p-6">
        <div className="flex gap-6">
          {/* Filtros laterales */}
          <aside className="w-64 flex-shrink-0">
            <InvoiceFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              invoices={invoices}
            />
          </aside>

          {/* Tabla principal */}
          <main className="flex-1 space-y-4">
            {/* Barra de búsqueda */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de factura o proveedor..."
                  value={filters.searchQuery}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </Card>

            {/* Tabla de facturas */}
            <Card className="border-border/40 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px]">Fecha</TableHead>
                    <TableHead className="w-[120px]">Nº Factura</TableHead>
                    <TableHead className="w-[200px]">Proveedor</TableHead>
                    <TableHead className="text-right w-[120px]">Total</TableHead>
                    <TableHead className="text-right w-[100px]">IVA</TableHead>
                    <TableHead className="w-[100px]">Centro</TableHead>
                    <TableHead className="text-center w-[80px]">OCR %</TableHead>
                    <TableHead className="w-[180px]">Estado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Cargando facturas...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices && filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        onClick={() => handleOpenSheet(invoice)}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {format(new Date(invoice.invoice_date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {invoice.invoice_number || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">
                              {invoice.supplier?.name || "Sin proveedor"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {invoice.total.toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {invoice.tax_total.toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {invoice.centro_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {invoice.ocr_confidence ? (
                            <span
                              className={`font-medium tabular-nums ${getOcrConfidenceColor(
                                invoice.ocr_confidence
                              )}`}
                            >
                              {Math.round(invoice.ocr_confidence * 100)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <ApprovalStatusBadge status={invoice.approval_status} />
                            {invoice.requires_manager_approval && (
                              <Badge variant="outline" className="text-xs">
                                Req. Gerente
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSheet(invoice);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="text-muted-foreground">
                          No se encontraron facturas
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Resumen */}
            {filteredInvoices && filteredInvoices.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Mostrando {filteredInvoices.length} facturas
                  </span>
                  <div className="flex gap-4 text-muted-foreground">
                    <span>
                      Total:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {filteredInvoices
                          .reduce((sum, inv) => sum + inv.total, 0)
                          .toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          })}
                      </span>
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* Sheet lateral de revisión */}
      <InvoiceReviewSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        invoice={selectedInvoice}
        onClose={handleCloseSheet}
      />
    </div>
  );
}
