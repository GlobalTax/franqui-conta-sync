import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, Sparkles } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useOrganization } from "@/hooks/useOrganization";
import { useReconciliation } from "@/hooks/useReconciliation";
import { BankAccountSelector } from "@/components/treasury/BankAccountSelector";
import { BankTransactionImporter } from "@/components/treasury/BankTransactionImporter";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Banks = () => {
  const { currentMembership } = useOrganization();
  const selectedCentro = currentMembership?.restaurant?.codigo;
  const [selectedAccount, setSelectedAccount] = useState<string>();
  const [showImporter, setShowImporter] = useState(false);

  const { accounts, isLoading: loadingAccounts } = useBankAccounts(selectedCentro);
  const { transactions, isLoading: loadingTransactions } = useBankTransactions({
    accountId: selectedAccount,
    centroCode: selectedCentro,
  });
  const { suggestMatches } = useReconciliation(selectedCentro);

  const currentAccount = accounts.find((a) => a.id === selectedAccount);

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const handleSuggestMatches = () => {
    if (selectedAccount) {
      suggestMatches(selectedAccount);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Transacciones Bancarias
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión de movimientos bancarios
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSuggestMatches} disabled={!selectedAccount}>
              <Sparkles className="h-4 w-4 mr-2" />
              Sugerir Conciliaciones
            </Button>
            <Dialog open={showImporter} onOpenChange={setShowImporter}>
              <DialogTrigger asChild>
                <Button disabled={!selectedAccount}>Importar CSV</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Importar Extracto Bancario</DialogTitle>
                </DialogHeader>
                {selectedAccount && (
                  <BankTransactionImporter
                    accountId={selectedAccount}
                    onImportComplete={() => setShowImporter(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-4">
          <BankAccountSelector
            value={selectedAccount}
            onChange={setSelectedAccount}
            centroCode={selectedCentro}
            placeholder="Selecciona una cuenta bancaria"
          />
        </div>

        {loadingAccounts ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentAccount?.current_balance.toFixed(2) || "0.00"}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentAccount?.account_name || "Selecciona una cuenta"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  +{totalIncome.toFixed(2)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactions.filter((t) => t.amount > 0).length} transacciones
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{totalExpenses.toFixed(2)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactions.filter((t) => t.amount < 0).length} transacciones
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Movimientos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay transacciones disponibles.{" "}
                {!selectedAccount && "Selecciona una cuenta bancaria."}
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          transaction.amount > 0
                            ? "bg-green-100 dark:bg-green-950"
                            : "bg-red-100 dark:bg-red-950"
                        }`}
                      >
                        {transaction.amount > 0 ? (
                          <ArrowDownToLine className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowUpFromLine className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString("es-ES")}
                          {transaction.reference && ` • ${transaction.reference}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            transaction.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount.toFixed(2)}€
                        </p>
                        {transaction.balance && (
                          <p className="text-sm text-muted-foreground">
                            Saldo: {transaction.balance.toFixed(2)}€
                          </p>
                        )}
                      </div>
                      <div className="text-xs">
                        {transaction.status === "reconciled" && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Conciliado
                          </span>
                        )}
                        {transaction.status === "pending" && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Banks;