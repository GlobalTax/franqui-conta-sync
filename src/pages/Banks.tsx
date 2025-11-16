import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowDownToLine, ArrowUpFromLine, Sparkles, Settings, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { KPICard } from "@/components/accounting/KPICard";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useOrganization } from "@/hooks/useOrganization";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useReconciliationRules, useCreateReconciliationRule, useDeleteReconciliationRule, useToggleRuleActive } from "@/hooks/useReconciliationRules";
import { useAutoMatchTransactions } from "@/hooks/useBankReconciliation";
import { useListNavigationShortcuts } from "@/lib/shortcuts/ShortcutManager";
import { BankAccountSelector } from "@/components/treasury/BankAccountSelector";
import { BankTransactionImporter } from "@/components/treasury/BankTransactionImporter";
import { BankReconciliationPanel } from "@/components/treasury/BankReconciliationPanel";
import { ReconciliationRuleForm } from "@/components/treasury/ReconciliationRuleForm";
import { ImportNorma43Button } from "@/components/treasury/ImportNorma43Button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

const Banks = () => {
  const { currentMembership } = useOrganization();
  const selectedCentro = currentMembership?.restaurant?.codigo;
  const [selectedAccount, setSelectedAccount] = useState<string>();
  const [showImporter, setShowImporter] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [activeTab, setActiveTab] = useState("transactions");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { accounts, isLoading: loadingAccounts } = useBankAccounts(selectedCentro);
  const { transactions, isLoading: loadingTransactions } = useBankTransactions({
    accountId: selectedAccount,
    centroCode: selectedCentro,
  });
  const { suggestMatches } = useReconciliation(selectedCentro);
  const autoMatchMutation = useAutoMatchTransactions();
  const { data: rules = [] } = useReconciliationRules(selectedCentro, selectedAccount);
  const createRuleMutation = useCreateReconciliationRule();
  const deleteRuleMutation = useDeleteReconciliationRule();
  const toggleRuleMutation = useToggleRuleActive();

  const currentAccount = accounts.find((a) => a.id === selectedAccount);

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // 🎹 Navegación por teclado j/k en transacciones
  useListNavigationShortcuts(
    transactions,
    selectedIndex,
    setSelectedIndex,
    (txn) => console.log('Opening transaction:', txn)
  );

  const handleSuggestMatches = () => {
    if (selectedAccount && selectedCentro) {
      autoMatchMutation.mutate({ bankAccountId: selectedAccount, limit: 100 });
    }
  };

  const handleCreateRule = (data: any) => {
    if (selectedAccount && selectedCentro) {
      createRuleMutation.mutate(
        {
          ...data,
          centro_code: selectedCentro,
          bank_account_id: selectedAccount,
        },
        {
          onSuccess: () => setShowRuleForm(false),
        }
      );
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
            {selectedAccount && selectedCentro && (
              <ImportNorma43Button
                centroCode={selectedCentro}
                bankAccountId={selectedAccount}
                onImportSuccess={() => setShowImporter(false)}
              />
            )}
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
            <KPICard
              title="Balance Total"
              value={currentAccount?.current_balance || 0}
              subtitle={currentAccount?.account_name || "Selecciona una cuenta"}
              format="currency"
              icon={Wallet}
            />
            
            <KPICard
              title="Ingresos del Mes"
              value={totalIncome}
              subtitle={`${transactions.filter((t) => t.amount > 0).length} transacciones`}
              format="currency"
              icon={TrendingUp}
              variant="success"
            />
            
            <KPICard
              title="Gastos del Mes"
              value={totalExpenses}
              subtitle={`${transactions.filter((t) => t.amount < 0).length} transacciones`}
              format="currency"
              icon={TrendingDown}
              variant="error"
            />
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Transacciones Bancarias</h2>
                <TabsList>
                  <TabsTrigger value="transactions">Movimientos</TabsTrigger>
                  <TabsTrigger value="reconciliation" disabled={!selectedAccount}>
                    Conciliación
                  </TabsTrigger>
                  <TabsTrigger value="rules" disabled={!selectedAccount}>
                    Reglas
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="p-6">
              <TabsContent value="transactions" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="reconciliation">
                {selectedAccount && (
                  <BankReconciliationPanel bankAccountId={selectedAccount} />
                )}
              </TabsContent>

              <TabsContent value="rules" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={showRuleForm} onOpenChange={setShowRuleForm}>
                    <DialogTrigger asChild>
                      <Button>
                        <Settings className="h-4 w-4 mr-2" />
                        Nueva Regla
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Nueva Regla de Conciliación</DialogTitle>
                      </DialogHeader>
                      {selectedAccount && selectedCentro && (
                        <ReconciliationRuleForm
                          centroCode={selectedCentro}
                          bankAccountId={selectedAccount}
                          onSubmit={handleCreateRule}
                          onCancel={() => setShowRuleForm(false)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                {rules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay reglas configuradas. Crea una regla para automatizar la conciliación.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{rule.rule_name}</p>
                            {rule.active ? (
                              <Badge variant="default">Activa</Badge>
                            ) : (
                              <Badge variant="outline">Inactiva</Badge>
                            )}
                            <Badge variant="secondary">
                              Prioridad: {rule.priority}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Tipo: {rule.auto_match_type}</p>
                            {rule.description_pattern && (
                              <p>Patrón: {rule.description_pattern}</p>
                            )}
                            {(rule.amount_min || rule.amount_max) && (
                              <p>
                                Rango: {rule.amount_min || 0}€ - {rule.amount_max || '∞'}€
                              </p>
                            )}
                            <p>Confianza: {rule.confidence_threshold}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.active}
                            onCheckedChange={(checked) =>
                              toggleRuleMutation.mutate({ id: rule.id, active: checked })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Banks;