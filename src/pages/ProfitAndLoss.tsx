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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";

const ProfitAndLoss = () => {
  const { selectedView } = useView();
  const [period, setPeriod] = useState("2024-01");
  const [selectedTemplate, setSelectedTemplate] = useState("PGC_2025");
  
  // Obtener plantillas disponibles
  const { data: templates, isLoading: isLoadingTemplates } = usePLTemplates();
  
  // Calcular fechas del periodo seleccionado
  const [year, month] = period.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  // Nuevo hook de P&L basado en reglas
  const { data, isLoading, isError } = usePLReport({
    templateCode: selectedTemplate,
    companyId: selectedView?.type === 'company' ? selectedView.id : undefined,
    centroCode: selectedView?.type === 'centre' ? selectedView.id : undefined,
    startDate,
    endDate,
  });

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
        subtitle={
          selectedView.type === 'company'
            ? `Vista consolidada: ${selectedView.name}`
            : `Centro: ${selectedView.name}`
        }
        actions={
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
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
          
          {/* Selector de Periodo */}
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
                    <div className="flex items-center gap-3 flex-1">
                      {line.rubric_code && (
                        <span className="font-mono text-xs text-muted-foreground w-20">
                          {line.rubric_code}
                        </span>
                      )}
                      <span
                        className={`${
                          line.is_total ? "font-semibold text-foreground" : ""
                        } ${
                          line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                            ? "font-bold text-lg"
                            : ""
                        }`}
                      >
                        {line.rubric_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span
                        className={`font-mono font-semibold text-right w-32 ${
                          line.amount >= 0 ? "text-success" : "text-foreground"
                        } ${
                          line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                            ? "text-lg"
                            : ""
                        }`}
                      >
                        {line.amount.toLocaleString("es-ES", {
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
                        {Math.abs(line.percentage || 0).toFixed(1)}%
                      </span>
                      {line.is_total && line.rubric_code !== 'resultado_neto' && line.rubric_code !== 'net_result' && (
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
