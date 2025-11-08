import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGeneralLedger } from "@/hooks/useGeneralLedger";
import { useOrganization } from "@/hooks/useOrganization";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { AccountSelector } from "@/components/accounting/AccountSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function GeneralLedger() {
  const { currentMembership } = useOrganization();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [accountCode, setAccountCode] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const centroCode = currentMembership?.restaurant?.id || "";
  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const endDateStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

  const { data, isLoading } = useGeneralLedger(centroCode, startDateStr, endDateStr, accountCode);

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

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Contabilidad" },
          { label: "Libro Mayor" }
        ]}
        title="Libro Mayor"
        subtitle={currentMembership?.restaurant?.nombre || "Sin restaurante"}
        actions={
          data && (
            <ExportButton
              printRef={printRef}
              data={exportData}
              filename={`mayor-${startDateStr}-${endDateStr}`}
            />
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <div ref={printRef}>
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ) : groupedData && Object.values(groupedData).length > 0 ? (
          Object.values(groupedData).map((group: any) => (
            <Card key={group.account_code} className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  {group.account_code} - {group.account_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No hay movimientos en el período seleccionado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
