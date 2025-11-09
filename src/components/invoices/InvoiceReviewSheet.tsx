import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApprovalStatusBadge } from "./ApprovalStatusBadge";
import { InvoiceApprovalDialog } from "./InvoiceApprovalDialog";
import { useInvoiceReview } from "@/hooks/useInvoiceReview";
import { useCentres } from "@/hooks/useCentres";
import { useInvoiceLines } from "@/hooks/useInvoicesReceived";
import {
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Hash,
  DollarSign,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { InvoiceReceived } from "@/hooks/useInvoicesReceived";

// ✅ Lazy load: Secciones pesadas del sheet
const InvoiceReviewPDFSection = lazy(() => import("./review/InvoiceReviewPDFSection").then(m => ({ default: m.InvoiceReviewPDFSection })));
const InvoiceReviewLinesSection = lazy(() => import("./review/InvoiceReviewLinesSection").then(m => ({ default: m.InvoiceReviewLinesSection })));
const InvoiceReviewHistorySection = lazy(() => import("./review/InvoiceReviewHistorySection").then(m => ({ default: m.InvoiceReviewHistorySection })));

interface InvoiceReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceReceived | null;
  onClose: () => void;
}

export function InvoiceReviewSheet({
  open,
  onOpenChange,
  invoice,
  onClose,
}: InvoiceReviewSheetProps) {
  const navigate = useNavigate();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedCentro, setSelectedCentro] = useState<string>("");

  const { data: centres } = useCentres();
  const { data: invoiceLines } = useInvoiceLines(invoice?.id || null, "received");
  const { assignCentre, generateEntry, isLoading } = useInvoiceReview(invoice?.id || null);

  const handleAssignCentre = () => {
    if (!invoice || !selectedCentro) return;
    assignCentre({ invoiceId: invoice.id, centroCode: selectedCentro });
  };

  const handleGenerateEntry = () => {
    if (!invoice) return;
    generateEntry(invoice.id);
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;
    
    const percent = Math.round(confidence * 100);
    let variant: "default" | "secondary" | "destructive" = "secondary";
    let label = "Baja";
    let className = "bg-red-100 text-red-700 border-red-200";
    
    if (percent >= 90) {
      variant = "default";
      label = "Alta";
      className = "bg-green-100 text-green-700 border-green-200";
    } else if (percent >= 70) {
      variant = "default";
      label = "Media";
      className = "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
    
    return (
      <Badge variant={variant} className={className}>
        {percent}% {label}
      </Badge>
    );
  };

  if (!invoice) return null;

  const canApprove = invoice.approval_status === "pending_approval" || 
                     invoice.approval_status === "approved_manager";
  const canGenerateEntry = invoice.approval_status === "approved_accounting" && 
                           invoice.status !== "posted";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-2xl font-semibold">
                      {invoice.invoice_number || "Sin número"}
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground mt-1">
                      Revisión de factura recibida
                    </SheetDescription>
                  </div>
                  <ApprovalStatusBadge status={invoice.approval_status} />
                </div>
              </SheetHeader>

              <Separator />

              {/* ✅ Preview del PDF - Lazy Load */}
              <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
                <InvoiceReviewPDFSection documentPath={invoice.document_path} />
              </Suspense>

              <Separator />

              {/* Datos OCR */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Datos Extraídos (OCR)
                  </h3>
                  {getConfidenceBadge(invoice.ocr_confidence)}
                </div>
                
                <Card className="p-4 bg-accent/30 border-border/40">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Proveedor
                      </Label>
                      <p className="font-medium">
                        {invoice.supplier?.name || "Sin proveedor"}
                      </p>
                      {invoice.supplier?.tax_id && (
                        <p className="text-xs text-muted-foreground">
                          CIF: {invoice.supplier.tax_id}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Número de Factura
                      </Label>
                      <p className="font-medium">{invoice.invoice_number || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha Emisión
                      </Label>
                      <p className="font-medium">
                        {format(new Date(invoice.invoice_date), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha Vencimiento
                      </Label>
                      <p className="font-medium">
                        {invoice.due_date
                          ? format(new Date(invoice.due_date), "dd/MM/yyyy", {
                              locale: es,
                            })
                          : "-"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Base Imponible
                      </Label>
                      <p className="font-medium tabular-nums">
                        {invoice.subtotal.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        IVA
                      </Label>
                      <p className="font-medium tabular-nums">
                        {invoice.tax_total.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                    </div>

                    <div className="col-span-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground">
                        Total Factura
                      </Label>
                      <p className="text-2xl font-semibold tabular-nums">
                        {invoice.total.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              </section>

              <Separator />

              {/* ✅ Líneas de factura - Lazy Load */}
              {invoiceLines && invoiceLines.length > 0 && (
                <>
                  <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
                    <InvoiceReviewLinesSection invoiceLines={invoiceLines} />
                  </Suspense>
                  <Separator />
                </>
              )}

              {/* ✅ Historial de aprobaciones - Lazy Load */}
              {invoice.approvals && invoice.approvals.length > 0 && (
                <>
                  <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
                    <InvoiceReviewHistorySection approvals={invoice.approvals} />
                  </Suspense>
                  <Separator />
                </>
              )}

              {/* Acciones */}
              <section>
                <h3 className="font-semibold text-lg mb-4">Acciones</h3>
                
                <div className="space-y-4">
                  {/* Asignar centro */}
                  <Card className="p-4 bg-accent/20 border-border/40">
                    <Label className="text-sm font-medium mb-2 block">
                      Centro de Coste
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedCentro || invoice.centro_code}
                        onValueChange={setSelectedCentro}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccionar centro" />
                        </SelectTrigger>
                        <SelectContent>
                        {centres?.map((centre) => (
                          <SelectItem key={centre.codigo} value={centre.codigo}>
                            {centre.codigo} - {centre.nombre}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAssignCentre}
                        disabled={!selectedCentro || selectedCentro === invoice.centro_code || isLoading}
                        variant="outline"
                      >
                        Asignar
                      </Button>
                    </div>
                  </Card>

                  {/* Botones de acción */}
                  <div className="grid grid-cols-2 gap-3">
                    {canApprove && (
                      <>
                        <Button
                          onClick={() => setApprovalDialogOpen(true)}
                          className="w-full"
                          variant="default"
                          disabled={isLoading}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          onClick={() => setApprovalDialogOpen(true)}
                          className="w-full"
                          variant="destructive"
                          disabled={isLoading}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      </>
                    )}
                    
                    {canGenerateEntry && (
                      <Button
                        onClick={handleGenerateEntry}
                        className="col-span-2 w-full"
                        variant="default"
                        disabled={isLoading}
                      >
                        <FileCheck className="h-4 w-4 mr-2" />
                        Generar Asiento Contable
                      </Button>
                    )}
                  </div>

                  {/* Info del estado */}
                  <Card className="p-4 bg-muted/30 border-border/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Estado Actual
                        </Label>
                        <div className="mt-1">
                          <ApprovalStatusBadge status={invoice.approval_status} />
                        </div>
                      </div>
                      <div className="text-right">
                        <Label className="text-xs text-muted-foreground">
                          Aprobaciones
                        </Label>
                        <p className="font-medium mt-1">
                          {invoice.approvals?.length || 0} /{" "}
                          {invoice.requires_manager_approval ? 2 : 1}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Dialog de aprobación */}
      <InvoiceApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        invoice={invoice}
        approvalLevel={
          invoice.approval_status === "pending_approval" ? "manager" : "accounting"
        }
      />
    </>
  );
}
