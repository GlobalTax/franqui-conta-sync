import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useInvoicesReceived } from '@/hooks/useInvoicesReceived';
import { useCreateReconciliation } from '@/hooks/useBankReconciliation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, FileText, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionAmount: number;
  transactionDate: string;
  onReconcileSuccess?: () => void;
}

export const InvoiceSearchDialog = ({
  open,
  onOpenChange,
  transactionId,
  transactionAmount,
  transactionDate,
  onReconcileSuccess,
}: InvoiceSearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [amountTolerance, setAmountTolerance] = useState(5); // %
  const [dateTolerance, setDateTolerance] = useState(7); // días

  const { data: invoicesResult, isLoading } = useInvoicesReceived({
    searchTerm: searchTerm || undefined,
    limit: 50,
  });

  const { mutate: createReconciliation, isPending } = useCreateReconciliation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const isWithinAmountTolerance = (invoiceAmount: number) => {
    const tolerance = Math.abs(transactionAmount) * (amountTolerance / 100);
    const diff = Math.abs(Math.abs(invoiceAmount) - Math.abs(transactionAmount));
    return diff <= tolerance;
  };

  const isWithinDateTolerance = (invoiceDate: string) => {
    const txDate = new Date(transactionDate);
    const invDate = new Date(invoiceDate);
    const diffDays = Math.abs((txDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= dateTolerance;
  };

  const filteredInvoices = (invoicesResult?.data || []).filter((invoice) => {
    const amountMatch = isWithinAmountTolerance(invoice.total);
    const dateMatch = isWithinDateTolerance(invoice.invoice_date);
    return amountMatch && dateMatch;
  });

  const handleReconcile = (invoiceId: string) => {
    createReconciliation(
      {
        bank_transaction_id: transactionId,
        matched_type: 'invoice_received',
        matched_id: invoiceId,
        reconciliation_status: 'matched',
        confidence_score: 95,
        notes: 'Conciliación manual mediante búsqueda',
      },
      {
        onSuccess: () => {
          toast.success('Factura conciliada correctamente');
          onOpenChange(false);
          onReconcileSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Buscar Factura Recibida</DialogTitle>
          <DialogDescription>
            Encuentra facturas que coincidan con la transacción bancaria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nº factura, proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountTolerance">
                Tolerancia Importe (±%)
              </Label>
              <Input
                id="amountTolerance"
                type="number"
                min="0"
                max="100"
                value={amountTolerance}
                onChange={(e) => setAmountTolerance(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                ±{formatCurrency((Math.abs(transactionAmount) * amountTolerance) / 100)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTolerance">
                Tolerancia Fecha (±días)
              </Label>
              <Input
                id="dateTolerance"
                type="number"
                min="0"
                max="365"
                value={dateTolerance}
                onChange={(e) => setDateTolerance(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Info Transacción */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Importe:</span>
                <span className="ml-2 font-medium">{formatCurrency(transactionAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha:</span>
                <span className="ml-2 font-medium">
                  {format(new Date(transactionDate), 'dd/MM/yyyy', { locale: es })}
                </span>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">
                Resultados ({filteredInvoices.length})
              </h4>
            </div>

            <ScrollArea className="h-[380px] border rounded-lg">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Cargando facturas...
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron facturas que coincidan con los criterios
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredInvoices.map((invoice) => {
                    const amountDiff = Math.abs(invoice.total) - Math.abs(transactionAmount);
                    const isExactMatch = Math.abs(amountDiff) < 0.01;

                    return (
                      <div
                        key={invoice.id}
                        className="p-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{invoice.invoice_number}</span>
                              {isExactMatch && (
                                <Badge variant="default" className="text-xs">
                                  Coincidencia exacta
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {invoice.status}
                              </Badge>
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>
                                <span className="font-medium">Proveedor:</span>{' '}
                                {invoice.supplier?.name || 'Sin proveedor'}
                              </div>
                              <div className="flex items-center gap-4">
                                <span>
                                  <span className="font-medium">Fecha:</span>{' '}
                                  {format(new Date(invoice.invoice_date), 'dd/MM/yyyy', {
                                    locale: es,
                                  })}
                                </span>
                                <span>
                                  <span className="font-medium">Importe:</span>{' '}
                                  {formatCurrency(invoice.total)}
                                </span>
                              </div>
                              {Math.abs(amountDiff) >= 0.01 && (
                                <div className="text-xs text-amber-600">
                                  Diferencia: {formatCurrency(amountDiff)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {invoice.document_path && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.document_path!, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleReconcile(invoice.id)}
                              disabled={isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Conciliar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
