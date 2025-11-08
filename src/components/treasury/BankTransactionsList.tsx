import { useBankTransactions } from "@/hooks/useBankTransactions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BankTransactionsListProps {
  accountId: string;
  dateRange: { from: Date; to: Date };
  onSelect: (transactionId: string) => void;
  selectedId: string | null;
}

export const BankTransactionsList = ({
  accountId,
  dateRange,
  onSelect,
  selectedId,
}: BankTransactionsListProps) => {
  const { transactions, isLoading } = useBankTransactions({ accountId });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reconciled":
        return "bg-green-500";
      case "pending":
        return "bg-gray-400";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "reconciled":
        return "bg-green-50 border-green-200 hover:border-green-300";
      case "pending":
        return "bg-card border-border/40 hover:border-border";
      case "ignored":
        return "bg-gray-50 border-gray-200 hover:border-gray-300";
      default:
        return "bg-card border-border/40";
    }
  };

  if (!accountId) {
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

  const filteredTransactions = transactions.filter((t) => {
    const transDate = new Date(t.transaction_date);
    return transDate >= dateRange.from && transDate <= dateRange.to;
  });

  return (
    <div className="h-full flex flex-col bg-muted/20">
      <div className="p-4 border-b border-border/40 bg-card/50">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Extracto Bancario
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredTransactions.length} transacciones
        </p>
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
                onClick={() => onSelect(transaction.id)}
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all",
                  getStatusBg(transaction.status),
                  selectedId === transaction.id && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("h-3 w-3 rounded-full", getStatusColor(transaction.status))} />
                      <p className="font-medium text-sm text-foreground">{transaction.description}</p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.transaction_date), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>

                  <div className="text-right ml-4">
                    <p
                      className={cn(
                        "font-semibold text-base",
                        transaction.amount > 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {formatCurrency(transaction.amount)}
                    </p>

                    {transaction.status === "reconciled" && (
                      <Badge variant="default" className="mt-2 bg-green-100 text-green-700 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Conciliado
                      </Badge>
                    )}

                    {transaction.status === "ignored" && (
                      <Badge variant="secondary" className="mt-2">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Ignorado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
