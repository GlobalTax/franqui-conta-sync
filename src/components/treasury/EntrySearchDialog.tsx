import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAccountingEntries } from '@/hooks/useAccountingEntries';
import { useCreateReconciliation } from '@/hooks/useBankReconciliation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, FileText, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface EntrySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionAmount: number;
  transactionDate: string;
  centroCode: string;
  onReconcileSuccess?: () => void;
}

export const EntrySearchDialog = ({
  open,
  onOpenChange,
  transactionId,
  transactionAmount,
  transactionDate,
  centroCode,
  onReconcileSuccess,
}: EntrySearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [amountTolerance, setAmountTolerance] = useState(5); // %
  const [dateTolerance, setDateTolerance] = useState(7); // días

  // Calcular rango de fechas
  const txDate = new Date(transactionDate);
  const startDate = new Date(txDate);
  startDate.setDate(startDate.getDate() - dateTolerance);
  const endDate = new Date(txDate);
  endDate.setDate(endDate.getDate() + dateTolerance);

  const { data: entries = [], isLoading } = useAccountingEntries(centroCode, {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    searchTerm: searchTerm || undefined,
  });

  const { mutate: createReconciliation, isPending } = useCreateReconciliation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const isWithinAmountTolerance = (entryAmount: number) => {
    const tolerance = Math.abs(transactionAmount) * (amountTolerance / 100);
    const diff = Math.abs(Math.abs(entryAmount) - Math.abs(transactionAmount));
    return diff <= tolerance;
  };

  const filteredEntries = entries.filter((entry) => {
    // Buscar por importe en debe o haber
    const debitMatch = isWithinAmountTolerance(entry.total_debit);
    const creditMatch = isWithinAmountTolerance(entry.total_credit);
    return debitMatch || creditMatch;
  });

  const handleReconcile = (entryId: string) => {
    createReconciliation(
      {
        bank_transaction_id: transactionId,
        matched_type: 'entry',
        matched_id: entryId,
        reconciliation_status: 'matched',
        confidence_score: 90,
        notes: 'Conciliación manual mediante búsqueda de asientos',
      },
      {
        onSuccess: () => {
          toast.success('Asiento conciliado correctamente');
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
          <DialogTitle>Buscar Asiento Contable</DialogTitle>
          <DialogDescription>
            Encuentra asientos que coincidan con la transacción bancaria
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
                  placeholder="Descripción, documento..."
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
                Resultados ({filteredEntries.length})
              </h4>
            </div>

            <ScrollArea className="h-[380px] border rounded-lg">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Cargando asientos...
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No se encontraron asientos que coincidan con los criterios
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEntries.map((entry) => {
                    const entryAmount = transactionAmount > 0 ? entry.total_credit : entry.total_debit;
                    const amountDiff = Math.abs(entryAmount) - Math.abs(transactionAmount);
                    const isExactMatch = Math.abs(amountDiff) < 0.01;

                    return (
                      <div
                        key={entry.id}
                        className="p-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Asiento #{entry.entry_number}
                              </span>
                              {isExactMatch && (
                                <Badge variant="default" className="text-xs">
                                  Coincidencia exacta
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {entry.status}
                              </Badge>
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="font-medium">
                                {entry.description}
                              </div>
                              <div className="flex items-center gap-4">
                                <span>
                                  <span className="font-medium">Fecha:</span>{' '}
                                  {format(new Date(entry.entry_date), 'dd/MM/yyyy', {
                                    locale: es,
                                  })}
                                </span>
                                <span>
                                  <span className="font-medium">Debe:</span>{' '}
                                  {formatCurrency(entry.total_debit)}
                                </span>
                                <span>
                                  <span className="font-medium">Haber:</span>{' '}
                                  {formatCurrency(entry.total_credit)}
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
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleReconcile(entry.id)}
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
