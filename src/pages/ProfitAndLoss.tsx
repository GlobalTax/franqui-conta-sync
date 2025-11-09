import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, AlertCircle, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useView } from "@/contexts/ViewContext";
import { usePLTemplates } from "@/hooks/usePLTemplates";
import { usePLReport } from "@/hooks/usePLReport";
import { usePLAdjustments } from "@/hooks/usePLAdjustments";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PLQSRKPICards } from "@/components/pl/PLQSRKPICards";
import { exportPLHistorical } from "@/lib/pl-export-excel";
import { YearSelector } from "@/components/pl/YearSelector";
import { AdjustmentCell } from "@/components/pl/AdjustmentCell";
import { PLTableSingle } from "@/components/pl/PLTableSingle";
import type { PLReportLineWithAdjustments } from "@/types/profit-loss";

// ✅ Lazy load: Tabla multi-año (solo se carga cuando se activa la vista)
const PLTableMultiYear = lazy(() => import("@/components/pl/PLTableMultiYear").then(m => ({ default: m.PLTableMultiYear })));


// Skeleton para lazy loading
function PLTableMultiYearSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" />
      {[1,2,3,4,5,6,7,8].map(i => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

const ProfitAndLoss = () => {
  const { selectedView } = useView();
  const [period, setPeriod] = useState("2025-01");
  const [selectedTemplate, setSelectedTemplate] = useState("McD_QSR_v1");
  const [compareYears, setCompareYears] = useState<number[]>([2024, 2023, 2022]);
  const [viewMode, setViewMode] = useState<"single" | "multi-year">("single");
  const [showAccumulated, setShowAccumulated] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);
  
  // ✅ Función de preload con estado de React
  const preloadMultiYearTable = useCallback(() => {
    if (!isPreloaded) {
      setIsPreloaded(true);
      import("@/components/pl/PLTableMultiYear").then(() => {
        console.log("✅ PLTableMultiYear precargado");
      }).catch((err) => {
        console.warn("⚠️ Error al precargar PLTableMultiYear:", err);
        setIsPreloaded(false);
      });
    }
  }, [isPreloaded]);
  
  // Obtener plantillas disponibles
  const { data: templates, isLoading: isLoadingTemplates } = usePLTemplates();
  
  // ✅ MEMOIZADO: Calcular fechas del periodo seleccionado
  const dateRange = useMemo(() => {
    const [year, month] = period.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    return { year, month, startDate, endDate };
  }, [period]);

  // ✅ MEMOIZADO: Configuración de queries multi-año
  const yearQueriesConfig = useMemo(() => 
    compareYears.map(y => ({
      templateCode: selectedTemplate,
      companyId: selectedView?.type === 'company' ? selectedView.id : undefined,
      centroCode: selectedView?.type === 'centre' ? selectedView.id : undefined,
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
    })), 
  [compareYears, selectedTemplate, selectedView]);

  // Fetch paralelo para multi-año
  const yearQueries = yearQueriesConfig.map(config => usePLReport(config));

  // Hook de ajustes manuales
  const {
    upsertAdjustment,
    getAdjustmentAmount,
  } = usePLAdjustments(
    selectedView?.type === 'company' ? selectedView.id : undefined,
    selectedView?.type === 'centre' ? selectedView.id : undefined,
    selectedTemplate,
    dateRange.startDate
  );

  // Vista single (mensual, dual o con ajustes)
  const { data, isLoading, isError } = usePLReport({
    templateCode: selectedTemplate,
    companyId: selectedView?.type === 'company' ? selectedView.id : undefined,
    centroCode: selectedView?.type === 'centre' ? selectedView.id : undefined,
    startDate: showAccumulated ? undefined : dateRange.startDate,
    endDate: showAccumulated ? undefined : dateRange.endDate,
    showAccumulated,
    periodDate: showAccumulated ? dateRange.startDate : undefined,
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

  // ✅ MEMOIZADO: Export Excel con formato histórico
  const handleExport = useCallback(() => {
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
        years: [dateRange.year],
        restaurantName: selectedView?.name || "Restaurante",
        templateName: templates?.find((t) => t.code === selectedTemplate)?.name || selectedTemplate,
      });
    }
  }, [viewMode, yearQueries, compareYears, plData, dateRange.year, selectedView, templates, selectedTemplate]);

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
            <Select 
              value={viewMode} 
              onValueChange={(v) => setViewMode(v as "single" | "multi-year")}
              onOpenChange={(open) => {
                if (open && viewMode === "single") {
                  preloadMultiYearTable();
                }
              }}
            >
              <SelectTrigger 
                className="w-40"
                onMouseEnter={() => {
                  if (viewMode === "single") {
                    preloadMultiYearTable();
                  }
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Vista Mensual</SelectItem>
                <SelectItem 
                  value="multi-year"
                  onMouseEnter={preloadMultiYearTable}
                >
                  <div className="flex items-center gap-2">
                    <span>Multi-Año</span>
                    {isPreloaded && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/20 animate-bounce-in flex items-center gap-1"
                            >
                              <span>⚡ Listo</span>
                              <Info className="h-3 w-3 motion-safe:animate-pulse" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Vista precargada para cambio instantáneo</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </SelectItem>
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
              } - {new Date(dateRange.startDate).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
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
              // ✅ Vista Multi-Año: Tabla comparativa con lazy loading
              <Suspense fallback={<PLTableMultiYearSkeleton />}>
                <PLTableMultiYear 
                  yearQueries={yearQueries}
                  compareYears={compareYears}
                  isQSRTemplate={isQSRTemplate}
                />
              </Suspense>
            ) : plData.length === 0 ? (
              // Vista Single sin datos
              <div className="text-center py-12 text-muted-foreground">
                No hay datos contables para este periodo.
                <br />
                <span className="text-sm">Crea asientos contables para ver el P&L.</span>
              </div>
            ) : (
              // Vista Single con tabla virtualizada
              <PLTableSingle
                data={plData}
                showAccumulated={showAccumulated}
                showAdjustments={showAdjustments}
                getAdjustmentAmount={getAdjustmentAmount}
                upsertAdjustment={upsertAdjustment}
                enableVirtualization={plData.length > 50}
              />
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
