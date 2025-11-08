import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useJournalBook } from "@/hooks/useJournalBook";
import { useView } from "@/contexts/ViewContext";
import { useCentres } from "@/hooks/useCentres";
import { useCentreCompanies } from "@/hooks/useCentreCompanies";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { exportJournalBookPDF } from "@/lib/pdf-export";
import { toast } from "sonner";

export default function JournalBook() {
  const { selectedView } = useView();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const printRef = useRef<HTMLDivElement>(null);

  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const endDateStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

  const { data, isLoading } = useJournalBook(selectedView, startDateStr, endDateStr);
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

    // Agrupar datos por asiento
    const groupedData = data.reduce((acc, line) => {
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

    const entries = Object.values(groupedData);

    exportJournalBookPDF(
      entries,
      {
        razonSocial: principalCompany.razon_social,
        cif: principalCompany.cif,
        direccion: currentCentre?.direccion || undefined,
      },
      {
        start: startDateStr,
        end: endDateStr,
      },
      `libro-diario-oficial-${startDateStr}-${endDateStr}`
    );

    toast.success("PDF oficial generado correctamente");
  };

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

  if (!selectedView) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Contabilidad" },
            { label: "Libro Diario" }
          ]}
          title="Libro Diario"
        />
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                Selecciona una sociedad o centro para ver el libro diario
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Contabilidad" },
          { label: "Libro Diario" }
        ]}
        title="Libro Diario"
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
              filename={`diario-${startDateStr}-${endDateStr}`}
              showOfficialPDF={!!principalCompany}
              onExportOfficialPDF={handleExportOfficialPDF}
            />
          )
        }
      />

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
