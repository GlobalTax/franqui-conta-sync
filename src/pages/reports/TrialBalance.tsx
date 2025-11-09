import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useView } from "@/contexts/ViewContext";
import { useTrialBalance } from "@/hooks/useTrialBalance";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TrialBalance = () => {
  const { selectedView } = useView();
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const centroCode =
    selectedView?.type === "centre" ? selectedView.id : undefined;

  const { data: trialBalance, isLoading } = useTrialBalance(
    centroCode,
    selectedView?.type === "company" ? selectedView.id : undefined,
    startDate?.toISOString().split("T")[0],
    endDate?.toISOString().split("T")[0]
  );

  // Group by level for better visualization
  const groupedByLevel = trialBalance?.reduce((acc, row) => {
    if (!acc[row.nivel]) {
      acc[row.nivel] = [];
    }
    acc[row.nivel].push(row);
    return acc;
  }, {} as Record<number, typeof trialBalance>);

  // Calculate totals
  const totals = trialBalance?.reduce(
    (acc, row) => ({
      debit: acc.debit + Number(row.debit_total),
      credit: acc.credit + Number(row.credit_total),
    }),
    { debit: 0, credit: 0 }
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Prepare export data
  const exportData = trialBalance || [];

  if (!selectedView) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seleccione una vista (empresa o centro) para ver el balance de sumas y saldos
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Reportes" },
            { label: "Sumas y Saldos" },
          ]}
          title="Balance de Sumas y Saldos"
        />

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Filtros y Exportación
              </h2>
              <ExportButton
                printRef={printRef}
                data={exportData}
                filename="sumas-y-saldos"
              />
            </div>
          </div>
          <div className="p-6">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
        </div>

        <div ref={printRef} className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold">Balance de Sumas y Saldos</h2>
            {startDate && endDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Periodo: {startDate.toLocaleDateString("es-ES")} -{" "}
                {endDate.toLocaleDateString("es-ES")}
              </p>
            )}
          </div>
          <div>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !trialBalance || trialBalance.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No hay movimientos contables en el periodo seleccionado
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedByLevel || {})
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, accounts]) => (
                      <>
                        {accounts.map((row) => (
                          <TableRow
                            key={row.account_code}
                            className={
                              Number(level) <= 2
                                ? "font-semibold bg-muted/50"
                                : ""
                            }
                          >
                            <TableCell
                              className="font-mono"
                              style={{ paddingLeft: `${Number(level) * 12}px` }}
                            >
                              {row.account_code}
                            </TableCell>
                            <TableCell>{row.account_name}</TableCell>
                            <TableCell className="text-center">{row.nivel}</TableCell>
                            <TableCell className="text-right font-mono">
                              {row.debit_total > 0 ? formatAmount(row.debit_total) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {row.credit_total > 0 ? formatAmount(row.credit_total) : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-semibold ${
                                row.balance > 0
                                  ? "text-green-600"
                                  : row.balance < 0
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {formatAmount(row.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))}
                  {/* Totals Row */}
                  <TableRow className="font-bold bg-primary/10 border-t-2">
                    <TableCell colSpan={3}>TOTALES</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(totals?.debit || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(totals?.credit || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount((totals?.debit || 0) - (totals?.credit || 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialBalance;
