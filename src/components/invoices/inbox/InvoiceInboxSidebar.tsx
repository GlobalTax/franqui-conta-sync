import { useEffect } from 'react';
import { X, CheckCircle, XCircle, Building2, FileText, Calendar, DollarSign } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InboxStatusBadge } from './InboxStatusBadge';
import { InvoicePDFPreview } from '../InvoicePDFPreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { CentreSelector } from '@/components/accounting/CentreSelector';
import { toast } from 'sonner';
import { OCREngineBadge } from './OCREngineBadge';
import { OCRConfidenceAlert } from './OCRConfidenceAlert';

interface InvoiceInboxSidebarProps {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAssignCentre?: (id: string, centroCode: string) => void;
  onGenerateEntry?: (id: string) => void;
}

export function InvoiceInboxSidebar({
  invoiceId,
  open,
  onClose,
  onApprove,
  onReject,
  onAssignCentre,
  onGenerateEntry,
}: InvoiceInboxSidebarProps) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      
      const { data, error } = await supabase
        .from('invoices_received')
        .select(`
          *,
          supplier:suppliers(name, tax_id, email),
          lines:invoices_received_lines(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId && open,
  });

  if (!open || !invoiceId) return null;

  const handleAssignCentre = (centroCode: string) => {
    if (onAssignCentre && invoiceId) {
      onAssignCentre(invoiceId, centroCode);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[600px] lg:w-[700px] p-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : invoice ? (
          <>
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b space-y-3">
              <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                  <SheetTitle className="text-2xl">
                    {invoice.supplier?.name || 'Proveedor desconocido'}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    CIF: {invoice.supplier?.tax_id || 'N/A'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {invoice.total?.toFixed(2)}€
                </span>
                <InboxStatusBadge
                  status={invoice.approval_status || invoice.status}
                  hasEntry={!!invoice.entry_id}
                />
              </div>
            </SheetHeader>

            {/* OCR Metrics & Alerts */}
            {invoice.ocr_confidence && (
              <div className="px-6 py-4 bg-muted/30 border-y">
                <OCRConfidenceAlert
                  notes={[]}
                  engine="openai"
                  confidence={invoice.ocr_confidence}
                />
              </div>
            )}

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Datos principales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha</p>
                      <p className="text-sm font-medium">
                        {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nº Factura</p>
                      <p className="text-sm font-medium">{invoice.invoice_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Centro</p>
                      <p className="text-sm font-medium">{invoice.centro_code || 'Sin asignar'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                      <p className="text-xs text-muted-foreground">Base + IVA</p>
                      <p className="text-sm font-medium">
                        {invoice.subtotal?.toFixed(2)}€ + {invoice.tax_total?.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </div>

                {/* Centro Selector si no tiene centro */}
                {!invoice.centro_code && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Asigna un centro para poder aprobar esta factura
                    </p>
                  </div>
                )}

                <Separator />

                {/* PDF Preview */}
                {invoice.document_path && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Documento PDF</h3>
                    <InvoicePDFPreview
                      documentPath={invoice.document_path}
                      className="h-[400px]"
                    />
                  </div>
                )}

                {/* Líneas de factura */}
                {invoice.lines && invoice.lines.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Líneas de Factura</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-2">Descripción</th>
                              <th className="text-right p-2">Cantidad</th>
                              <th className="text-right p-2">Precio</th>
                              <th className="text-right p-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(invoice.lines) && invoice.lines.map((line: any, idx: number) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">{line.description}</td>
                                <td className="text-right p-2">{line.quantity}</td>
                                <td className="text-right p-2">{line.unit_price?.toFixed(2)}€</td>
                                <td className="text-right p-2 font-medium">
                                  {line.line_total?.toFixed(2)}€
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Footer con acciones */}
            <div className="border-t p-4 bg-muted/30">
              <div className="flex gap-2 justify-end">
                {(invoice.approval_status === 'draft' || invoice.status === 'draft') && (
                  <>
                    {!invoice.centro_code ? (
                      <Button disabled variant="outline">
                        Asigna centro primero
                      </Button>
                    ) : (
                      <Button
                        onClick={() => onApprove?.(invoiceId)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Enviar a Aprobar
                      </Button>
                    )}
                  </>
                )}

                {invoice.approval_status === 'pending_approval' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => onReject?.(invoiceId)}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => onApprove?.(invoiceId)}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aprobar
                    </Button>
                  </>
                )}

                {invoice.approval_status === 'approved_accounting' && !invoice.entry_id && (
                  <Button
                    onClick={() => onGenerateEntry?.(invoiceId)}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Generar Asiento
                  </Button>
                )}

                {invoice.entry_id && (
                  <Button variant="outline" disabled>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Contabilizado
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <p className="text-muted-foreground">No se encontró la factura.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
