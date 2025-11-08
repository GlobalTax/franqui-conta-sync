import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBalanceSheet } from "@/hooks/useBalanceSheet";
import { useOrganization } from "@/hooks/useOrganization";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function BalanceSheet() {
  const { currentMembership } = useOrganization();
  const [fechaCorte, setFechaCorte] = useState<Date | undefined>(new Date());
  const printRef = useRef<HTMLDivElement>(null);

  const centroCode = currentMembership?.restaurant?.id || "";
  const fechaCorteStr = fechaCorte ? format(fechaCorte, "yyyy-MM-dd") : "";

  const { data, isLoading } = useBalanceSheet(centroCode, fechaCorteStr);

  const exportData = data?.items.map((item) => ({
    Grupo: item.grupo,
    Nombre: item.nombre_grupo,
    Saldo: item.balance,
  })) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Contabilidad" },
          { label: "Balance de Situación" }
        ]}
        title="Balance de Situación"
        subtitle={currentMembership?.restaurant?.nombre || "Sin restaurante"}
        actions={
          <>
            <DateRangePicker
              startDate={fechaCorte}
              endDate={fechaCorte}
              onStartDateChange={setFechaCorte}
              onEndDateChange={setFechaCorte}
            />
            {data && (
              <ExportButton
                printRef={printRef}
                data={exportData}
                filename={`balance-${fechaCorteStr}`}
              />
            )}
          </>
        }
      />

      <div ref={printRef}>
        <Card>
          <CardHeader>
            <CardTitle>Fecha de corte: {fechaCorte ? format(fechaCorte, "dd/MM/yyyy") : "-"}</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {data?.items.map((item) => (
                    <TableRow key={item.grupo}>
                      <TableCell className="font-medium">{item.grupo}</TableCell>
                      <TableCell>{item.nombre_grupo}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.balance).toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={2}>TOTAL ACTIVO</TableCell>
                    <TableCell className="text-right">
                      {Number(data?.totals.activo || 0).toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>TOTAL PASIVO</TableCell>
                    <TableCell className="text-right">
                      {Number(data?.totals.pasivo || 0).toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>PATRIMONIO NETO</TableCell>
                    <TableCell className="text-right">
                      {Number(data?.totals.patrimonioNeto || 0).toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
