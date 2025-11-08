import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGeneralLedger } from "@/hooks/useGeneralLedger";
import { useView } from "@/contexts/ViewContext";
import { useCentres } from "@/hooks/useCentres";
import { useCentreCompanies } from "@/hooks/useCentreCompanies";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { AccountSelector } from "@/components/accounting/AccountSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { exportGeneralLedgerPDF } from "@/lib/pdf-export";
import { toast } from "sonner";

export default function GeneralLedger() {
  const { selectedView } = useView();
  const { currentMembership } = useOrganization();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [accountCode, setAccountCode] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const endDateStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

  const { data, isLoading } = useGeneralLedger(selectedView, startDateStr, endDateStr, accountCode);
  const { data: centres } = useCentres();
  const currentCentre = centres?.find(c => c.id === selectedView?.id);
  const { principalCompany } = useCentreCompanies(currentCentre?.id);

  const handleExportOfficialPDF = () => {
    if (!data || data.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    if (!principalCompany) {
      toast.error("No se encontró información de la empresa");
      return;
    }

    // Agrupar datos por cuenta
    const groupedData = data.reduce((acc, line) => {
      const key = line.account_code;
      if (!acc[key]) {
        acc[key] = {
          account_code: line.account_code,
          account_name: line.account_name,
          lines: [],
        };
      }
      acc[key].lines.push(line);
      return acc;
    }, {} as Record<string, any>);

    const accounts = Object.values(groupedData);

    exportGeneralLedgerPDF(
      accounts,
      {
        razonSocial: principalCompany.razon_social,
        cif: principalCompany.cif,
        direccion: currentCentre?.direccion || undefined,
      },
      {
        start: startDateStr,
        end: endDateStr,
      },
      `libro-mayor-oficial-${startDateStr}-${endDateStr}`
    );

    toast.success("PDF oficial generado correctamente");
  };

  const exportData = data?.map((line) => ({
    Cuenta: line.account_code,
    Nombre: line.account_name,
    Fecha: format(new Date(line.entry_date), "dd/MM/yyyy"),
    Asiento: line.entry_number,
    Descripción: line.description,
    Debe: line.debit,
    Haber: line.credit,
    Saldo: line.balance,
  })) || [];

  // Agrupar por cuenta
  const groupedData = data?.reduce((acc, line) => {
    const key = line.account_code;
    if (!acc[key]) {
      acc[key] = {
        account_code: line.account_code,
        account_name: line.account_name,
        lines: [],
      };
    }
    acc[key].lines.push(line);
    return acc;
  }, {} as Record<string, any>);

  if (!selectedView) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            breadcrumbs={[
              { label: "Contabilidad" },
              { label: "Libro Mayor" }
            ]}
            title="Libro Mayor"
          />
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-center h-64 p-6">
              <div className="text-center space-y-2">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Selecciona una sociedad o centro para ver el libro mayor
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
            { label: "Libro Mayor" }
          ]}
          title="Libro Mayor"
          subtitle={
            selectedView.type === 'company'
              ? `Vista consolidada: ${selectedView.name}`
              : `Centro: ${selectedView.name}`
          }
          actions={
            data && (
              <ExportButton
                printRef={printRef}
                data={exportData}
                filename={`mayor-${startDateStr}-${endDateStr}`}
                showOfficialPDF={!!principalCompany}
                onExportOfficialPDF={handleExportOfficialPDF}
              />
            )
          }
        />

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>
          <div className="p-6 space-y-4">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Cuenta (opcional)</label>
              <AccountSelector
                value={accountCode}
                onChange={setAccountCode}
                organizationId={currentMembership?.organization?.id || ""}
              />
            </div>
          </div>
        </div>

        <div ref={printRef}>
          {isLoading ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-6">
                <Skeleton className="h-12 w-full mb-2" />
                <Skeleton className="h-12 w-full mb-2" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : groupedData && Object.values(groupedData).length > 0 ? (
            Object.values(groupedData).map((group: any) => (
              <div key={group.account_code} className="border border-border rounded-lg overflow-hidden mb-4">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h2 className="text-lg font-semibold">
                    {group.account_code} - {group.account_name}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Asiento</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Debe</TableHead>
                        <TableHead className="text-right">Haber</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.lines.map((line: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{format(new Date(line.entry_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{line.entry_number}</TableCell>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">
                            {Number(line.debit).toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(line.credit).toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(line.balance).toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-6 text-center text-muted-foreground">
                No hay movimientos en el período seleccionado
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
