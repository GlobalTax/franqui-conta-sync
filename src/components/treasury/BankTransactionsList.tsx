import { useState } from 'react';
import { useBankTransactions } from '@/hooks/useBankTransactions';
import { useUndoReconciliation } from '@/hooks/useUndoReconciliation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BankTransactionsListProps {
  bankAccountId?: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onSelectTransaction: (transactionId: string | null) => void;
  selectedTransaction: string | null;
  selectedTransactionIds?: string[];
  onSelectTransactionIds?: (ids: string[]) => void;
}

export function BankTransactionsList({
  bankAccountId,
  dateRange,
  onSelectTransaction,
  selectedTransaction,
  selectedTransactionIds = [],
  onSelectTransactionIds,
}: BankTransactionsListProps) {
  const { transactions, isLoading } = useBankTransactions({ accountId: bankAccountId });
  const { mutate: undoReconciliation, isPending: isUndoing } = useUndoReconciliation();

  const handleToggleSelection = (transactionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onSelectTransactionIds) return;

    if (selectedTransactionIds.includes(transactionId)) {
      onSelectTransactionIds(selectedTransactionIds.filter((id) => id !== transactionId));
    } else {
      onSelectTransactionIds([...selectedTransactionIds, transactionId]);
    }
  };

  const handleUndoReconciliation = (transactionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    undoReconciliation({ transactionId });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reconciled':
        return 'bg-success';
      case 'pending':
        return 'bg-muted-foreground';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'reconciled':
        return 'bg-success-light border-success-light hover:border-success';
      case 'pending':
        return 'bg-card border-border/40 hover:border-border';
      case 'ignored':
        return 'bg-muted border-muted hover:border-muted-foreground';
      default:
        return 'bg-card border-border/40';
    }
  };

  if (!bankAccountId) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-muted/20">
        <p className="text-sm text-muted-foreground">Selecciona una cuenta bancaria para ver transacciones</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 bg-muted/20 h-full">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const filteredTransactions =
    transactions?.filter((t) => {
      if (!dateRange.from || !dateRange.to) return true;
      const transDate = new Date(t.transaction_date);
      return transDate >= dateRange.from && transDate <= dateRange.to;
    }) || [];

  return (
    <div className="h-full flex flex-col bg-muted/20">
      <div className="p-4 border-b border-border/40 bg-card/50">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extracto Bancario</h3>
        <p className="text-sm text-muted-foreground mt-1">{filteredTransactions.length} transacciones</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No hay transacciones en este período</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => onSelectTransaction(transaction.id)}
                className={cn(
                  'p-4 rounded-lg border-2 cursor-pointer transition-all',
                  getStatusBg(transaction.status),
                  selectedTransaction === transaction.id && 'ring-2 ring-primary ring-offset-2',
                  selectedTransactionIds.includes(transaction.id) && 'border-primary'
                )}
              >
                <div className="flex items-start gap-3">
                  {onSelectTransactionIds && (
                    <div onClick={(e) => handleToggleSelection(transaction.id, e)} className="pt-1">
                      <Checkbox checked={selectedTransactionIds.includes(transaction.id)} />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('h-3 w-3 rounded-full', getStatusColor(transaction.status))} />
                      <p className="font-medium text-sm text-foreground">{transaction.description}</p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.transaction_date), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>

                  <div className="text-right ml-4">
                    <p
                      className={cn(
                        'font-semibold text-base',
                        transaction.amount > 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {formatCurrency(transaction.amount)}
                    </p>

                    <div className="flex items-center gap-2 mt-2 justify-end">
                      {transaction.status === 'reconciled' && (
                        <>
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Conciliado
                          </Badge>
                          {/* FASE 6: Botón de Undo */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleUndoReconciliation(transaction.id, e)}
                            disabled={isUndoing}
                            className="h-7 px-2"
                          >
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}

                      {transaction.status === 'ignored' && (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Ignorado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
