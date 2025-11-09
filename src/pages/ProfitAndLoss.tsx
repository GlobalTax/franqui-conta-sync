import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useView } from "@/contexts/ViewContext";
import { usePLTemplates } from "@/hooks/usePLTemplates";
import { usePLReport } from "@/hooks/usePLReport";
import { usePLAdjustments } from "@/hooks/usePLAdjustments";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { PLQSRKPICards } from "@/components/pl/PLQSRKPICards";
import { exportPLHistorical } from "@/lib/pl-export-excel";
import { YearSelector } from "@/components/pl/YearSelector";
import { AdjustmentCell } from "@/components/pl/AdjustmentCell";
import type { PLReportLineWithAdjustments } from "@/types/profit-loss";

const ProfitAndLoss = () => {
  const { selectedView } = useView();
  const [period, setPeriod] = useState("2025-01");
  const [selectedTemplate, setSelectedTemplate] = useState("McD_QSR_v1");
  const [compareYears, setCompareYears] = useState<number[]>([2024, 2023, 2022]);
  const [viewMode, setViewMode] = useState<"single" | "multi-year">("single");
  const [showAccumulated, setShowAccumulated] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  
  // Obtener plantillas disponibles
  const { data: templates, isLoading: isLoadingTemplates } = usePLTemplates();
  
  // Calcular fechas del periodo seleccionado
  const [year, month] = period.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  // Fetch paralelo para multi-año
  const yearQueries = compareYears.map(y => {
    const yearStartDate = `${y}-01-01`;
    const yearEndDate = `${y}-12-31`;
    return usePLReport({
      templateCode: selectedTemplate,
      companyId: selectedView?.type === 'company' ? selectedView.id : undefined,
      centroCode: selectedView?.type === 'centre' ? selectedView.id : undefined,
      startDate: yearStartDate,
      endDate: yearEndDate,
    });
  });

  // Hook de ajustes manuales
  const {
    upsertAdjustment,
    getAdjustmentAmount,
  } = usePLAdjustments(
    selectedView?.type === 'company' ? selectedView.id : undefined,
    selectedView?.type === 'centre' ? selectedView.id : undefined,
    selectedTemplate,
    startDate
  );

  // Vista single (mensual, dual o con ajustes)
  const { data, isLoading, isError } = usePLReport({
    templateCode: selectedTemplate,
    companyId: selectedView?.type === 'company' ? selectedView.id : undefined,
    centroCode: selectedView?.type === 'centre' ? selectedView.id : undefined,
    startDate: showAccumulated ? undefined : startDate,
    endDate: showAccumulated ? undefined : endDate,
    showAccumulated,
    periodDate: showAccumulated ? startDate : undefined,
    includeAdjustments: showAdjustments,
  });

  // Determinar si estamos cargando o hay error
  const isLoadingMultiYear = viewMode === "multi-year" && yearQueries.some(q => q.isLoading);
  const isErrorMultiYear = viewMode === "multi-year" && yearQueries.some(q => q.isError);
  const finalIsLoading = viewMode === "multi-year" ? isLoadingMultiYear : isLoading;
  const finalIsError = viewMode === "multi-year" ? isErrorMultiYear : isError;

  const plData = data?.plData || [];
  const summary = data?.summary || {
    netResult: 0,
    ebitda: 0,
    ebit: 0,
    totalIncome: 0,
    totalExpenses: 0,
    grossMargin: 0,
    grossMarginPercent: 0,
    ebitdaMarginPercent: 0,
    ebitMarginPercent: 0,
    netMarginPercent: 0,
  };

  // Detectar si es plantilla QSR (McD_QSR_v1)
  const isQSRTemplate = selectedTemplate === "McD_QSR_v1";

  // Export Excel con formato histórico
  const handleExport = () => {
    if (viewMode === "multi-year") {
      // Multi-año: extraer datos de todos los años
      const plDataByYear = yearQueries.map((q) => q.data?.plData || []);

      exportPLHistorical({
        plDataByYear,
        years: compareYears,
        restaurantName: selectedView?.name || "Restaurante",
        templateName: templates?.find((t) => t.code === selectedTemplate)?.name || selectedTemplate,
      });
    } else {
      // Single: exportar solo el periodo actual
      exportPLHistorical({
        plDataByYear: [plData],
        years: [year],
        restaurantName: selectedView?.name || "Restaurante",
        templateName: templates?.find((t) => t.code === selectedTemplate)?.name || selectedTemplate,
      });
    }
  };

  if (!selectedView) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          breadcrumbs={[
            { label: "Contabilidad" },
            { label: "Cuenta de Pérdidas y Ganancias" }
          ]}
          title="Cuenta de Pérdidas y Ganancias"
        />
        <div className="mx-auto max-w-7xl p-6">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Selecciona una sociedad o centro para ver la cuenta de resultados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (finalIsError) {
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
        subtitle={
          selectedView.type === 'company'
            ? `Vista consolidada: ${selectedView.name}`
            : `Centro: ${selectedView.name}`
        }
        actions={
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as "single" | "multi-year")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Vista Mensual</SelectItem>
                <SelectItem value="multi-year">Multi-Año</SelectItem>
              </SelectContent>
            </Select>
            {viewMode === "single" && (
              <>
                <div className="flex gap-2">
                  <Button
                    variant={!showAccumulated ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowAccumulated(false);
                      setShowAdjustments(false);
                    }}
                  >
                    Mensual
                  </Button>
                  <Button
                    variant={showAccumulated ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowAccumulated(true);
                      setShowAdjustments(false);
                    }}
                  >
                    Mes + Acumulado
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={!showAdjustments ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowAdjustments(false);
                      setShowAccumulated(false);
                    }}
                  >
                    Vista Normal
                  </Button>
                  <Button
                    variant={showAdjustments ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowAdjustments(true);
                      setShowAccumulated(false);
                    }}
                  >
                    Con Ajustes
                  </Button>
                </div>
              </>
            )}
            <Button onClick={handleExport} disabled={!plData || plData.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        }
      />
      <div className="mx-auto max-w-7xl p-6 space-y-6">

        <div className="flex items-center gap-4">
          {/* Selector de Plantilla */}
          {isLoadingTemplates ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar plantilla" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.code}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Badge de plantilla activa */}
          <Badge variant="outline" className="hidden sm:inline-flex">
            {templates?.find(t => t.code === selectedTemplate)?.name || selectedTemplate}
          </Badge>
          
          {/* Selector de Periodo - Solo en vista single */}
          {viewMode === "single" && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-01">Enero 2025</SelectItem>
                <SelectItem value="2024-01">Enero 2024</SelectItem>
                <SelectItem value="2024-02">Febrero 2024</SelectItem>
                <SelectItem value="2024-03">Marzo 2024</SelectItem>
                <SelectItem value="2023-12">Diciembre 2023</SelectItem>
                <SelectItem value="2023-11">Noviembre 2023</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Selector de años - Solo en vista multi-año */}
        {viewMode === "multi-year" && (
          <YearSelector 
            selectedYears={compareYears}
            onChange={setCompareYears}
          />
        )}

        {finalIsLoading ? (
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
        ) : isQSRTemplate ? (
          <PLQSRKPICards plData={plData} summary={summary} />
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-6 bg-card rounded-2xl shadow-minimal hover:shadow-minimal-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Resultado Neto</p>
              </div>
              <div className={`text-2xl font-bold ${summary.netResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                {summary.netResult.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}€
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.netMarginPercent.toFixed(1)}% margen neto
              </p>
            </div>

            <div className="p-6 bg-card rounded-2xl shadow-minimal hover:shadow-minimal-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">EBITDA</p>
              </div>
              <div className={`text-2xl font-bold ${summary.ebitda >= 0 ? '' : 'text-destructive'}`}>
                {summary.ebitda.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}€
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margen EBITDA: {summary.ebitdaMarginPercent.toFixed(1)}%
              </p>
            </div>

            <div className="p-6 bg-card rounded-2xl shadow-minimal hover:shadow-minimal-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Ingresos</p>
              </div>
              <div className="text-2xl font-bold text-success">
                {Math.abs(summary.totalIncome).toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}€
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                100% base de cálculo
              </p>
            </div>

            <div className="p-6 bg-card rounded-2xl shadow-minimal hover:shadow-minimal-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Gastos</p>
              </div>
              <div className="text-2xl font-bold text-destructive">
                {summary.totalExpenses.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}€
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.totalIncome !== 0 
                  ? ((summary.totalExpenses / Math.abs(summary.totalIncome)) * 100).toFixed(1)
                  : '0.0'
                }% sobre ingresos
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTemplate === 'PGC_2025' 
                ? 'PyG Consolidada'
                : selectedTemplate === 'McD_v1'
                ? 'P&L McDonald\'s'
                : 'Cuenta de Resultados'
              } - {new Date(startDate).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {finalIsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : viewMode === "multi-year" ? (
              // Vista Multi-Año: Tabla comparativa
              <div className="overflow-x-auto">
                {yearQueries.some(q => !q.data?.plData?.length) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No hay datos para algunos años seleccionados.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Header de años */}
                    <div className="flex items-center justify-between py-3 px-4 bg-muted font-semibold sticky top-0 z-10">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-mono text-xs w-20">Código</span>
                        <span>Concepto</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {compareYears.map((year) => (
                          <div key={year} className="flex items-center gap-2">
                            <span className="text-sm w-28 text-right">{year} €</span>
                            <span className="text-sm w-16 text-right">%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filas de datos */}
                    {yearQueries[0]?.data?.plData?.map((baseLine, idx) => {
                      const linesByYear = yearQueries.map(q => 
                        q.data?.plData?.find(l => l.rubric_code === baseLine.rubric_code)
                      );

                      return (
                        <div
                          key={`${baseLine.rubric_code}-${idx}`}
                          className={`flex items-center justify-between py-3 px-4 ${
                            baseLine.is_total
                              ? "bg-muted/50 font-semibold"
                              : "hover:bg-accent/30"
                          } ${
                            baseLine.rubric_code === 'resultado_neto' || baseLine.rubric_code === 'net_result'
                              ? "bg-primary/5 border-t-2 border-primary mt-2"
                              : ""
                          } ${
                            baseLine.rubric_code === 'ebitda' || baseLine.rubric_code === 'margen_bruto' || baseLine.rubric_code === 'gross_margin'
                              ? "border-l-4 border-l-primary"
                              : ""
                          }`}
                          style={{ paddingLeft: `${baseLine.level * 2 + 1}rem` }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {baseLine.rubric_code && (
                              <span className="font-mono text-xs text-muted-foreground w-20 flex-shrink-0">
                                {baseLine.rubric_code}
                              </span>
                            )}
                            <span
                              className={`truncate ${
                                baseLine.is_total ? "font-semibold text-foreground" : ""
                              } ${
                                baseLine.rubric_code === 'resultado_neto' || baseLine.rubric_code === 'net_result'
                                  ? "font-bold text-lg"
                                  : ""
                              }`}
                              title={baseLine.rubric_name}
                            >
                              {baseLine.rubric_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            {linesByYear.map((line, yearIdx) => (
                              <div key={yearIdx} className="flex items-center gap-2">
                                <span
                                  className={`font-mono font-semibold text-right w-28 ${
                                    (line?.amount ?? 0) >= 0 ? "text-success" : "text-foreground"
                                  } ${
                                    baseLine.rubric_code === 'resultado_neto' || baseLine.rubric_code === 'net_result'
                                      ? "text-lg"
                                      : ""
                                  }`}
                                >
                                  {(line?.amount ?? 0).toLocaleString("es-ES", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}€
                                </span>
                                <span
                                  className={`text-sm text-muted-foreground text-right w-16 ${
                                    baseLine.rubric_code === 'resultado_neto' || baseLine.rubric_code === 'net_result'
                                      ? "font-semibold"
                                      : ""
                                  }`}
                                >
                                  {Math.abs(line?.percentage ?? 0).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : plData.length === 0 ? (
              // Vista Single sin datos
              <div className="text-center py-12 text-muted-foreground">
                No hay datos contables para este periodo.
                <br />
                <span className="text-sm">Crea asientos contables para ver el P&L.</span>
              </div>
            ) : (
              // Vista Single: normal o dual
              <div className="space-y-1">
                {/* Header de la tabla */}
                <div className="flex items-center justify-between py-3 px-4 bg-muted font-semibold sticky top-0 z-10">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-mono text-xs w-20">Código</span>
                    <span>Concepto</span>
                  </div>
                  {showAdjustments ? (
                    <div className="flex items-center gap-4">
                      <span className="text-sm w-32 text-right text-muted-foreground">Calculado</span>
                      <span className="text-sm w-32 text-right bg-accent px-2 py-1 rounded">A Sumar</span>
                      <span className="text-sm w-32 text-right font-semibold">Importe</span>
                      <span className="text-sm w-16 text-right">%</span>
                    </div>
                  ) : showAccumulated ? (
                    <div className="flex items-center gap-4">
                      <span className="text-sm w-32 text-right">Mes €</span>
                      <span className="text-sm w-20 text-right">Mes %</span>
                      <span className="text-sm w-32 text-right bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">Acum. €</span>
                      <span className="text-sm w-20 text-right bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">Acum. %</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-8">
                      <span className="text-sm w-32 text-right">Importe</span>
                      <span className="text-sm w-16 text-right">%</span>
                    </div>
                  )}
                </div>

                {/* Filas de datos */}
                {plData.map((line: any, idx) => {
                  const isAccumulatedData = 'amount_period' in line;
                  const isAdjustmentData = 'amount_calculated' in line;
                  const displayAmount = isAccumulatedData ? line.amount_period : isAdjustmentData ? line.amount_final : line.amount;
                  const displayPercentage = isAccumulatedData ? line.percentage_period : line.percentage;

                  return (
                    <div
                      key={`${line.rubric_code}-${idx}`}
                      className={`flex items-center justify-between py-3 px-4 ${
                        line.is_total
                          ? "bg-muted/50 font-semibold"
                          : "hover:bg-accent/30"
                      } ${
                        line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                          ? "bg-primary/5 border-t-2 border-primary mt-2"
                          : ""
                      } ${
                        line.rubric_code === 'ebitda' || line.rubric_code === 'margen_bruto' || line.rubric_code === 'gross_margin'
                          ? "border-l-4 border-l-primary"
                          : ""
                      }`}
                      style={{ paddingLeft: `${line.level * 2 + 1}rem` }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {line.rubric_code && (
                          <span className="font-mono text-xs text-muted-foreground w-20 flex-shrink-0">
                            {line.rubric_code}
                          </span>
                        )}
                        <span
                          className={`truncate ${
                            line.is_total ? "font-semibold text-foreground" : ""
                          } ${
                            line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                              ? "font-bold text-lg"
                              : ""
                          }`}
                          title={line.rubric_name}
                        >
                          {line.rubric_name}
                        </span>
                      </div>
                      
                      {showAdjustments && isAdjustmentData ? (
                        <div className="flex items-center gap-4">
                          {/* Calculado */}
                          <span className="font-mono text-right w-32 text-muted-foreground">
                            {line.amount_calculated.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}€
                          </span>
                          {/* A Sumar (editable) */}
                          <div className="w-32 bg-accent px-2 py-1 rounded">
                            <AdjustmentCell
                              rubricCode={line.rubric_code}
                              currentAdjustment={getAdjustmentAmount(line.rubric_code)}
                              onUpdate={(amount) =>
                                upsertAdjustment.mutate({
                                  rubricCode: line.rubric_code,
                                  amount,
                                })
                              }
                              isDisabled={line.is_total}
                            />
                          </div>
                          {/* Importe (final) */}
                          <span
                            className={`font-mono font-semibold text-right w-32 ${
                              line.amount_final >= 0 ? "text-success" : "text-foreground"
                            }`}
                          >
                            {line.amount_final.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}€
                          </span>
                          {/* % */}
                          <span className="text-sm text-muted-foreground text-right w-16">
                            {Math.abs(line.percentage || 0).toFixed(1)}%
                          </span>
                        </div>
                      ) : showAccumulated && isAccumulatedData ? (
                        <div className="flex items-center gap-4">
                          {/* Mes € */}
                          <span
                            className={`font-mono font-semibold text-right w-32 ${
                              displayAmount >= 0 ? "text-success" : "text-foreground"
                            }`}
                          >
                            {displayAmount.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}€
                          </span>
                          {/* Mes % */}
                          <span className="text-sm text-muted-foreground text-right w-20">
                            {Math.abs(displayPercentage || 0).toFixed(1)}%
                          </span>
                          {/* Acumulado € */}
                          <span
                            className={`font-mono font-bold text-right w-32 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded ${
                              line.amount_ytd >= 0 ? "text-success" : "text-foreground"
                            }`}
                          >
                            {line.amount_ytd.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}€
                          </span>
                          {/* Acumulado % */}
                          <span className="text-sm font-semibold text-right w-20 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">
                            {Math.abs(line.percentage_ytd || 0).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-8">
                          <span
                            className={`font-mono font-semibold text-right w-32 ${
                              displayAmount >= 0 ? "text-success" : "text-foreground"
                            } ${
                              line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                                ? "text-lg"
                                : ""
                            }`}
                          >
                            {displayAmount.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}€
                          </span>
                          <span
                            className={`text-sm text-muted-foreground text-right w-16 ${
                              line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                                ? "font-semibold"
                                : ""
                            }`}
                          >
                            {Math.abs(displayPercentage || 0).toFixed(1)}%
                          </span>
                          {line.is_total && line.rubric_code !== 'resultado_neto' && line.rubric_code !== 'net_result' && (
                            <div className="w-6">
                              {displayAmount >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-success" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {!finalIsLoading && (viewMode === "single" ? plData.length > 0 : yearQueries.some(q => q.data?.plData?.length)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ratios Clave</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Bruto</span>
                <span className={`font-semibold ${summary.grossMarginPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.grossMarginPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen EBIT</span>
                <span className={`font-semibold ${summary.ebitMarginPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.ebitMarginPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen EBITDA</span>
                <span className={`font-semibold ${summary.ebitdaMarginPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.ebitdaMarginPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Neto</span>
                <span className={`font-semibold ${summary.netMarginPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {summary.netMarginPercent.toFixed(1)}%
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
