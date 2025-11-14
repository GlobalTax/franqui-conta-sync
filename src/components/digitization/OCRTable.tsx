// ============================================================================
// OCR TABLE
// Tabla de facturas en bandeja OCR con selección múltiple
// ============================================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceReviewSheet } from "@/components/invoices/InvoiceReviewSheet";
import { ApprovalStatusBadge } from "@/components/invoices/ApprovalStatusBadge";
import { Building2, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { InvoiceReceived } from "@/hooks/useInvoicesReceived";

interface OCRTableProps {
  rows: InvoiceReceived[];
  isLoading: boolean;
  onSelectionChange: (ids: string[]) => void;
}

export function OCRTable({ rows, isLoading, onSelectionChange }: OCRTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceReceived | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
      onSelectionChange([]);
    } else {
      const allIds = rows.map((r) => r.id);
      setSelectedIds(allIds);
      onSelectionChange(allIds);
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    
    setSelectedIds(newSelection);
    onSelectionChange(newSelection);
  };

  const handleOpenSheet = (invoice: InvoiceReceived) => {
    setSelectedInvoice(invoice);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  const getOcrConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "text-muted-foreground";
    const percent = Math.round(confidence * 100);
    if (percent >= 90) return "text-green-600";
    if (percent >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Cargando facturas...
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/40 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.length === rows.length && rows.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead className="w-[120px]">Nº Factura</TableHead>
              <TableHead className="w-[200px]">Proveedor</TableHead>
              <TableHead className="text-right w-[120px]">Total</TableHead>
              <TableHead className="w-[100px]">Centro</TableHead>
              <TableHead className="text-center w-[100px]">OCR</TableHead>
              <TableHead className="w-[140px]">Estado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedIds.includes(invoice.id) ? 'bg-accent/30' : ''
                  }`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(invoice.id)}
                      onCheckedChange={() => handleSelectRow(invoice.id)}
                    />
                  </TableCell>
                  <TableCell 
                    className="font-medium"
                    onClick={() => handleOpenSheet(invoice)}
                  >
                    {format(new Date(invoice.invoice_date), "dd/MM/yyyy", {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell 
                    className="font-semibold"
                    onClick={() => handleOpenSheet(invoice)}
                  >
                    {invoice.invoice_number || "-"}
                  </TableCell>
                  <TableCell onClick={() => handleOpenSheet(invoice)}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {invoice.supplier?.name || "Sin proveedor"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell 
                    className="text-right font-medium tabular-nums"
                    onClick={() => handleOpenSheet(invoice)}
                  >
                    {invoice.total.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </TableCell>
                  <TableCell onClick={() => handleOpenSheet(invoice)}>
                    <Badge variant="outline" className="font-mono text-xs">
                      {invoice.centro_code}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className="text-center"
                    onClick={() => handleOpenSheet(invoice)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {invoice.ocr_confidence ? (
                        <>
                          <span
                            className={`font-medium tabular-nums text-xs ${getOcrConfidenceColor(
                              invoice.ocr_confidence
                            )}`}
                          >
                            {Math.round(invoice.ocr_confidence * 100)}%
                          </span>
                          {(invoice as any).ocr_template_name && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              📄 {(invoice as any).ocr_template_name}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={() => handleOpenSheet(invoice)}>
                    <ApprovalStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenSheet(invoice)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                    <p>No hay facturas para mostrar</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {selectedInvoice && (
        <InvoiceReviewSheet
          invoice={selectedInvoice}
          open={sheetOpen}
          onOpenChange={handleCloseSheet}
          onClose={handleCloseSheet}
        />
      )}
    </>
  );
}
