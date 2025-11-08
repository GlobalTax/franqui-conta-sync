import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useProfitAndLoss } from "@/hooks/useProfitAndLoss";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";

const ProfitAndLoss = () => {
  const { currentMembership } = useOrganization();
  const [period, setPeriod] = useState("2024-01");
  
  const selectedCentro = currentMembership?.restaurant?.codigo || "";
  
  // Calcular fechas del periodo seleccionado
  const [year, month] = period.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data, isLoading, isError } = useProfitAndLoss(
    selectedCentro || "",
    startDate,
    endDate
  );

  const plData = data?.plData || [];
  const summary = data?.summary || {
    netResult: 0,
    ebitda: 0,
    totalIncome: 0,
    totalExpenses: 0,
    ebitdaMargin: 0,
    netMargin: 0,
    grossMargin: 0,
    operatingMargin: 0,
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <Card className="border-destructive">
            <CardContent className="p-6">
              <p className="text-destructive">Error al cargar los datos de P&L</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        breadcrumbs={[
          { label: "Contabilidad" },
          { label: "Cuenta de Pérdidas y Ganancias" }
        ]}
        title="Cuenta de Pérdidas y Ganancias"
        subtitle="Análisis de resultados por periodo"
        actions={
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        }
      />
      <div className="mx-auto max-w-7xl p-6 space-y-6">

        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-01">Enero 2024</SelectItem>
              <SelectItem value="2024-02">Febrero 2024</SelectItem>
              <SelectItem value="2024-03">Marzo 2024</SelectItem>
              <SelectItem value="2023-12">Diciembre 2023</SelectItem>
              <SelectItem value="2023-11">Noviembre 2023</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Resultado Neto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.netResult.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.netMargin.toFixed(1)}% margen neto
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.ebitda >= 0 ? '' : 'text-destructive'}`}>
                  {summary.ebitda.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margen EBITDA: {summary.ebitdaMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {summary.totalIncome.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  100% base de cálculo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {summary.totalExpenses.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1)}% sobre ingresos
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              PyG Consolidada - {new Date(startDate).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : plData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay datos contables para este periodo.
                <br />
                <span className="text-sm">Crea asientos contables para ver el P&L.</span>
              </div>
            ) : (
              <div className="space-y-1">
                {plData.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-3 px-4 ${
                    line.isHeader
                      ? "bg-muted/50 font-semibold"
                      : "hover:bg-accent/30"
                  } ${
                    line.final
                      ? "bg-primary/5 border-t-2 border-primary mt-2"
                      : ""
                  } ${line.highlight ? "border-l-4 border-l-primary" : ""}`}
                  style={{ paddingLeft: `${line.level * 2 + 1}rem` }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {line.code && (
                      <span className="font-mono text-xs text-muted-foreground w-16">
                        {line.code}
                      </span>
                    )}
                    <span
                      className={`${
                        line.isHeader ? "font-semibold text-foreground" : ""
                      } ${line.final ? "font-bold text-lg" : ""}`}
                    >
                      {line.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span
                      className={`font-mono font-semibold text-right w-32 ${
                        line.amount >= 0 ? "text-success" : "text-foreground"
                      } ${line.final ? "text-lg" : ""}`}
                    >
                      {line.amount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      €
                    </span>
                    <span
                      className={`text-sm text-muted-foreground text-right w-16 ${
                        line.final ? "font-semibold" : ""
                      }`}
                    >
                      {line.percentage >= 0 ? "" : ""}
                      {Math.abs(line.percentage).toFixed(1)}%
                    </span>
                    {line.isHeader && !line.final && (
                      <div className="w-6">
                        {line.amount >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {!isLoading && plData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ratios Clave</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Bruto</span>
                <span className={`font-semibold ${summary.grossMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.grossMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Operativo</span>
                <span className={`font-semibold ${summary.operatingMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.operatingMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen EBITDA</span>
                <span className={`font-semibold ${summary.ebitdaMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.ebitdaMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Neto</span>
                <span className={`font-semibold ${summary.netMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.netMargin.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfitAndLoss;