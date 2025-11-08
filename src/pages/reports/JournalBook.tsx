import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useJournalBook } from "@/hooks/useJournalBook";
import { useOrganization } from "@/hooks/useOrganization";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function JournalBook() {
  const { currentMembership } = useOrganization();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const printRef = useRef<HTMLDivElement>(null);

  const centroCode = currentMembership?.restaurant?.id || "";
  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const endDateStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

  const { data, isLoading } = useJournalBook(centroCode, startDateStr, endDateStr);

  const exportData = data?.map((line) => ({
    Asiento: line.entry_number,
    Fecha: format(new Date(line.entry_date), "dd/MM/yyyy"),
    Descripción: line.description,
    Cuenta: line.account_code,
    Nombre: line.account_name,
    Debe: line.movement_type === "debit" ? line.amount : 0,
    Haber: line.movement_type === "credit" ? line.amount : 0,
  })) || [];

  // Agrupar por asiento
  const groupedData = data?.reduce((acc, line) => {
    const key = line.entry_id;
    if (!acc[key]) {
      acc[key] = {
        entry_id: line.entry_id,
        entry_number: line.entry_number,
        entry_date: line.entry_date,
        description: line.description,
        total_debit: line.total_debit,
        total_credit: line.total_credit,
        lines: [],
      };
    }
    acc[key].lines.push(line);
    return acc;
  }, {} as Record<string, any>);

  const entries = Object.values(groupedData || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Libro Diario</h1>
          <p className="text-muted-foreground mt-2">
            {currentMembership?.restaurant?.nombre || "Sin restaurante"}
          </p>
        </div>
        <div className="flex gap-2">
          {data && (
            <ExportButton
              printRef={printRef}
              data={exportData}
              filename={`diario-${startDateStr}-${endDateStr}`}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
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
        ) : entries.length > 0 ? (
          entries.map((entry: any) => {
            const isBalanced = Number(entry.total_debit) === Number(entry.total_credit);
            return (
              <Card key={entry.entry_id} className="mb-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Asiento #{entry.entry_number} - {format(new Date(entry.entry_date), "dd/MM/yyyy")}
                    </CardTitle>
                    {isBalanced ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">
                        Cuadrado
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Descuadrado</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cuenta</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Debe</TableHead>
                        <TableHead className="text-right">Haber</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.lines.map((line: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{line.account_code}</TableCell>
                          <TableCell>{line.account_name}</TableCell>
                          <TableCell className="text-right">
                            {line.movement_type === "debit"
                              ? Number(line.amount).toLocaleString("es-ES", {
                                  minimumFractionDigits: 2,
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.movement_type === "credit"
                              ? Number(line.amount).toLocaleString("es-ES", {
                                  minimumFractionDigits: 2,
                                })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={2}>TOTALES</TableCell>
                        <TableCell className="text-right">
                          {Number(entry.total_debit).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(entry.total_credit).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No hay asientos en el período seleccionado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
