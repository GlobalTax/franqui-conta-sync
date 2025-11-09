import { useState } from 'react';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ListFilter, Sparkles } from 'lucide-react';
import { useView } from '@/contexts/ViewContext';
import { BankAccountSelector } from '@/components/treasury/BankAccountSelector';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { BankTransactionsList } from '@/components/treasury/BankTransactionsList';
import { ReconciliationSuggestionsList } from '@/components/treasury/ReconciliationSuggestionsList';
import { ReconciliationRulesManager } from '@/components/treasury/ReconciliationRulesManager';
import { BulkReconciliationActions } from '@/components/treasury/BulkReconciliationActions';
import { ImportNorma43Button } from '@/components/treasury/ImportNorma43Button';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useAutoMatchWithRules } from '@/hooks/useNorma43';
import { toast } from 'sonner';

export default function BankReconciliation() {
  const { selectedView } = useView();
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const autoMatch = useAutoMatchWithRules();

  if (!selectedView) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Por favor, selecciona un centro para ver la conciliación bancaria.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const centroCode = typeof selectedView === 'string' ? selectedView : '';

  const handleAutoMatch = async () => {
    if (!selectedAccount || !centroCode) {
      toast.error('Selecciona una cuenta bancaria');
      return;
    }

    await autoMatch.mutateAsync({
      bankAccountId: selectedAccount,
      centroCode,
      limit: 100,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Conciliación Bancaria" breadcrumbs={[{ label: 'Tesorería', href: '/banks' }, { label: 'Conciliación' }]} />

        <Tabs defaultValue="reconciliation" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reconciliation">
              <ListFilter className="h-4 w-4 mr-2" />
              Conciliación
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Sparkles className="h-4 w-4 mr-2" />
              Reglas Automáticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reconciliation" className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <BankAccountSelector
                centroCode={centroCode}
                value={selectedAccount}
                onChange={setSelectedAccount}
              />

              <DateRangePicker
                startDate={dateRange.from}
                endDate={dateRange.to}
                onStartDateChange={(date) => setDateRange({ ...dateRange, from: date })}
                onEndDateChange={(date) => setDateRange({ ...dateRange, to: date })}
              />

              {selectedAccount && centroCode && (
                <ImportNorma43Button
                  centroCode={centroCode}
                  bankAccountId={selectedAccount}
                  onImportSuccess={() => toast.success('Transacciones importadas')}
                />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMatch}
                disabled={!selectedAccount || autoMatch.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {autoMatch.isPending ? 'Procesando...' : 'Auto-Conciliar'}
              </Button>
            </div>

            {selectedTransactionIds.length > 0 && (
              <BulkReconciliationActions
                selectedTransactionIds={selectedTransactionIds}
                onClearSelection={() => setSelectedTransactionIds([])}
              />
            )}

            <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full p-4">
                  <BankTransactionsList
                    bankAccountId={selectedAccount}
                    dateRange={dateRange}
                    onSelectTransaction={setSelectedTransaction}
                    selectedTransaction={selectedTransaction}
                    selectedTransactionIds={selectedTransactionIds}
                    onSelectTransactionIds={setSelectedTransactionIds}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full p-4">
                  <ReconciliationSuggestionsList
                    transactionId={selectedTransaction}
                    onReconcileSuccess={() => setSelectedTransaction(null)}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <ReconciliationRulesManager centroCode={centroCode} bankAccountId={selectedAccount} />
          </TabsContent>
        </Tabs>
    </div>
  );
}
