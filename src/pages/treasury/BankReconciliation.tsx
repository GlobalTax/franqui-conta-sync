import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BankAccountSelector } from "@/components/treasury/BankAccountSelector";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { BalanceCard } from "@/components/treasury/BalanceCard";
import { BankTransactionsList } from "@/components/treasury/BankTransactionsList";
import { ReconciliationSuggestionsList } from "@/components/treasury/ReconciliationSuggestionsList";
import { ImportNorma43Button } from "@/components/treasury/ImportNorma43Button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useView } from "@/contexts/ViewContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { subDays, format } from "date-fns";

export default function BankReconciliation() {
  const { selectedView } = useView();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  if (!selectedView) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Por favor, selecciona un centro para continuar.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const centroCode = selectedView.type === "centre" ? selectedView.id : undefined;

  return (
    <div className="min-h-screen bg-[#F8FAFB] p-6">
      <PageHeader
        title="Conciliación Bancaria"
        breadcrumbs={[
          { label: "Tesorería", href: "/tesoreria" },
          { label: "Conciliación", href: "/tesoreria/conciliacion" },
        ]}
      />

      {/* Filters Bar */}
      <div className="bg-card rounded-lg border border-border/40 p-4 mb-6 flex items-center gap-4">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
            Cuenta Bancaria
          </label>
          <BankAccountSelector
            value={selectedAccount}
            onChange={setSelectedAccount}
            centroCode={centroCode}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
            Período
          </label>
          <DateRangePicker
            startDate={dateRange.from}
            endDate={dateRange.to}
            onStartDateChange={(date) => date && setDateRange({ ...dateRange, from: date })}
            onEndDateChange={(date) => date && setDateRange({ ...dateRange, to: date })}
          />
        </div>
      </div>

      {/* Balance Card */}
      {selectedAccount && <BalanceCard accountId={selectedAccount} />}

      {/* Split View */}
      <div className="bg-card rounded-lg border border-border/40 overflow-hidden" style={{ height: "calc(100vh - 400px)" }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={30}>
            <BankTransactionsList
              accountId={selectedAccount}
              dateRange={dateRange}
              onSelect={setSelectedTransaction}
              selectedId={selectedTransaction}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={30}>
            <ReconciliationSuggestionsList
              transactionId={selectedTransaction}
              onReconcileSuccess={() => setSelectedTransaction(null)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Floating Button */}
      <ImportNorma43Button accountId={selectedAccount} />
    </div>
  );
}
