import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBalanceSheetCustom, useBalanceSheetTemplates } from "@/hooks/useBalanceSheetCustom";
import { useView } from "@/contexts/ViewContext";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function BalanceSheet() {
  const { selectedView } = useView();
  const [fechaCorte, setFechaCorte] = useState<Date | undefined>(new Date());
  const [selectedTemplate, setSelectedTemplate] = useState<string>("PGC_2025");
  const printRef = useRef<HTMLDivElement>(null);

  const fechaCorteStr = fechaCorte ? format(fechaCorte, "yyyy-MM-dd") : "";

  const { data: templates, isLoading: loadingTemplates } = useBalanceSheetTemplates();
  const { data: balanceData, isLoading } = useBalanceSheetCustom(
    selectedTemplate,
    selectedView,
    fechaCorteStr
  );

  const exportData = balanceData?.map((item) => ({
    Código: item.rubric_code,
    Rubro: item.rubric_name,
    Sección: item.section,
    Importe: item.amount,
  })) || [];

  if (!selectedView) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Contabilidad" },
              { label: "Balance de Situación" }
            ]}
            title="Balance de Situación"
          />
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-center h-64 p-6">
              <div className="text-center space-y-2">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Selecciona una sociedad o centro para ver el balance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Contabilidad" },
            { label: "Balance de Situación" }
          ]}
          title="Balance de Situación"
          subtitle={
            selectedView.type === 'company'
              ? `Vista consolidada: ${selectedView.name}`
              : `Centro: ${selectedView.name}`
          }
          actions={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="template" className="whitespace-nowrap">Plantilla</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                  disabled={loadingTemplates}
                >
                  <SelectTrigger id="template" className="w-64">
                    <SelectValue placeholder="Seleccionar plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.code} value={template.code}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DateRangePicker
                startDate={fechaCorte}
                endDate={fechaCorte}
                onStartDateChange={setFechaCorte}
                onEndDateChange={setFechaCorte}
              />
              {balanceData && (
                <ExportButton
                  printRef={printRef}
                  data={exportData}
                  filename={`balance-${selectedTemplate}-${fechaCorteStr}`}
                />
              )}
            </div>
          }
        />

        <div ref={printRef}>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold">
                {templates?.find(t => t.code === selectedTemplate)?.name || selectedTemplate}
              </h2>
              <p className="text-sm text-muted-foreground">
                Fecha de corte: {fechaCorte ? format(fechaCorte, "dd/MM/yyyy") : "-"}
              </p>
            </div>
            <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Saldo (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceData?.map((item) => (
                    <TableRow 
                      key={item.rubric_code}
                      className={item.is_total ? "bg-muted/50 font-semibold" : ""}
                    >
                      <TableCell className={item.level > 1 ? `pl-${item.level * 4}` : ""}>
                        {item.rubric_code} - {item.rubric_name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        }).format(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
