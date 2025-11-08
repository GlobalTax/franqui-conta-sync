import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useView } from "@/contexts/ViewContext";
import { useLibroIVASoportado } from "@/hooks/useIVABooks";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LibroIVASoportado = () => {
  const { selectedView } = useView();
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const centroCode =
    selectedView?.type === "centre" ? selectedView.id : undefined;

  const { data: libroIVA, isLoading } = useLibroIVASoportado(
    centroCode,
    startDate?.toISOString().split("T")[0],
    endDate?.toISOString().split("T")[0]
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES");
  };

  // Calculate totals
  const totals = libroIVA?.reduce(
    (acc, row) => ({
      base: acc.base + Number(row.base_imponible),
      cuota: acc.cuota + Number(row.cuota_iva),
      deducible: acc.deducible + Number(row.cuota_deducible),
      total: acc.total + Number(row.total_factura),
    }),
    { base: 0, cuota: 0, deducible: 0, total: 0 }
  );

  const exportData = libroIVA || [];

  if (!selectedView) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seleccione una vista (empresa o centro) para ver el libro de IVA
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "IVA" },
          { label: "Libro de Facturas Recibidas" },
        ]}
        title="Libro de IVA Soportado"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Filtros y Exportación
            </CardTitle>
            <ExportButton
              printRef={printRef}
              data={exportData}
              filename="libro-iva-soportado"
            />
          </div>
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

      <Card ref={printRef}>
        <CardHeader>
          <CardTitle>Libro de Facturas Recibidas (IVA Soportado)</CardTitle>
          {startDate && endDate && (
            <p className="text-sm text-muted-foreground">
              Periodo: {startDate.toLocaleDateString("es-ES")} -{" "}
              {endDate.toLocaleDateString("es-ES")}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !libroIVA || libroIVA.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No hay facturas recibidas en el periodo seleccionado
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nº Factura</TableHead>
                    <TableHead>NIF Proveedor</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Base Imponible</TableHead>
                    <TableHead className="text-center">% IVA</TableHead>
                    <TableHead className="text-right">Cuota IVA</TableHead>
                    <TableHead className="text-right">Cuota Deducible</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {libroIVA.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(row.fecha)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {row.numero_factura}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.proveedor_nif || "-"}
                      </TableCell>
                      <TableCell>{row.proveedor_nombre || "Sin proveedor"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(row.base_imponible)}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {row.tipo_iva}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(row.cuota_iva)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(row.cuota_deducible)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatAmount(row.total_factura)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.tipo_operacion}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="font-bold bg-primary/10 border-t-2">
                    <TableCell colSpan={4}>TOTALES</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(totals?.base || 0)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(totals?.cuota || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(totals?.deducible || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(totals?.total || 0)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibroIVASoportado;
