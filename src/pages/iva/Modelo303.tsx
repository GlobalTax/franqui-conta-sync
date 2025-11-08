import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useView } from "@/contexts/ViewContext";
import { useIVASummary303 } from "@/hooks/useIVABooks";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileSpreadsheet, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const Modelo303 = () => {
  const { selectedView } = useView();
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), 2, 31)
  );

  const centroCode =
    selectedView?.type === "centre" ? selectedView.id : undefined;

  const { data: summary, isLoading } = useIVASummary303(
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

  if (!selectedView) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seleccione una vista (empresa o centro) para preparar el modelo 303
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
          { label: "Modelo 303" },
        ]}
        title="Preparación Modelo 303 - IVA Trimestral"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Periodo de Liquidación
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Seleccione el trimestre completo (ejemplo: 01/01/2025 - 31/03/2025)
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !summary ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay datos de IVA en el periodo seleccionado
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* IVA Devengado (Repercutido) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">IVA Devengado (Repercutido)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Facturas expedidas y operaciones realizadas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Base Imponible Total</p>
                  <p className="text-2xl font-bold">
                    {formatAmount(summary.total_base_repercutido)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cuota de IVA Total</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatAmount(summary.total_cuota_repercutido)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IVA Deducible (Soportado) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">IVA Deducible (Soportado)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Facturas recibidas y gastos deducibles
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Base Imponible Total</p>
                  <p className="text-2xl font-bold">
                    {formatAmount(summary.total_base_soportado)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cuota Deducible</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatAmount(summary.total_cuota_deducible)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultado de la Liquidación */}
          <Card className="border-2">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-xl">Resultado de la Liquidación</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-semibold">
                    [27] IVA Devengado
                  </p>
                  <p className="text-xl font-bold text-red-600">
                    {formatAmount(summary.total_cuota_repercutido)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-semibold">
                    [45] IVA Deducible
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    - {formatAmount(summary.total_cuota_deducible)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-semibold">
                    [71] Resultado
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      summary.resultado_liquidacion > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {formatAmount(summary.resultado_liquidacion)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        A Ingresar / A Compensar
                      </p>
                      <p className="text-3xl font-bold">
                        {formatAmount(summary.resultado_final)}
                      </p>
                    </div>
                    <div className="text-right">
                      {summary.resultado_final > 0 ? (
                        <div className="text-red-600 font-semibold">
                          <p className="text-sm">Cuota a Ingresar</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Casilla [78]
                          </p>
                        </div>
                      ) : (
                        <div className="text-green-600 font-semibold">
                          <p className="text-sm">A Compensar</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Casilla [110]
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nota:</strong> Este es un cálculo preliminar. Verifique todos
                  los datos antes de presentar el modelo oficial. Consulte con su asesor
                  fiscal para casos especiales (prorrata, regímenes especiales, etc.)
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar Resumen PDF
                </Button>
                <Button variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar a Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Modelo303;
