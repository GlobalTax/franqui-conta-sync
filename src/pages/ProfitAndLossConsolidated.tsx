import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Building2, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useCentres } from "@/hooks/useCentres";
import { usePLTemplates } from "@/hooks/usePLTemplates";
import { usePLReport } from "@/hooks/usePLReport";
import { exportPLConsolidated } from "@/lib/pl-export-excel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Vista de P&L Consolidado Multi-Restaurante
 * Permite seleccionar múltiples centros y consolidar sus P&L
 */
const ProfitAndLossConsolidated = () => {
  const [selectedTemplate, setSelectedTemplate] = useState("McD_QSR_v1");
  const [selectedCentres, setSelectedCentres] = useState<string[]>([]);
  const [period, setPeriod] = useState("2024-01");

  const { data: centres, isLoading: isLoadingCentres } = useCentres();
  const { data: templates, isLoading: isLoadingTemplates } = usePLTemplates();

  // Calcular fechas del periodo
  const [year, month] = period.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  // Fetch consolidado usando usePLReport con centroCodes
  const { data: plResponse, isLoading: isLoadingPL } = usePLReport({
    templateCode: selectedTemplate,
    centroCodes: selectedCentres.length > 0 ? selectedCentres : undefined,
    startDate,
    endDate,
  });

  const plData = plResponse?.plData;

  const handleCentreToggle = (centreId: string) => {
    setSelectedCentres((prev) =>
      prev.includes(centreId)
        ? prev.filter((c) => c !== centreId)
        : [...prev, centreId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCentres.length === centres?.length) {
      setSelectedCentres([]);
    } else {
      setSelectedCentres(centres?.map((c) => c.codigo) || []);
    }
  };

  const handleExport = () => {
    if (!plData || selectedCentres.length === 0) return;

    const restaurantNames =
      centres
        ?.filter((c) => selectedCentres.includes(c.codigo))
        .map((c) => c.nombre) || [];

    exportPLConsolidated({
      plData,
      restaurantNames,
      templateName: templates?.find((t) => t.code === selectedTemplate)?.name || selectedTemplate,
      period: new Date(startDate).toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calcular resumen rápido
  const ventasNetas = plData?.find((l) => l.rubric_code === "ventas_netas");
  const resultadoNeto = plData?.find((l) => l.rubric_code === "resultado_neto");
  const pac = plData?.find((l) => l.rubric_code === "pac");
  const soi = plData?.find((l) => l.rubric_code === "soi");

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        breadcrumbs={[
          { label: "Contabilidad" },
          { label: "P&L Consolidado Multi-Restaurante" },
        ]}
        title="P&L Consolidado"
        subtitle="Consolidación de múltiples restaurantes"
        actions={
          <Button
            onClick={handleExport}
            disabled={!plData || selectedCentres.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Selectores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {/* Selector de Plantilla */}
              {isLoadingTemplates ? (
                <Skeleton className="h-10 w-48" />
              ) : (
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Plantilla" />
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

              {/* Selector de Periodo */}
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-01">Enero 2024</SelectItem>
                  <SelectItem value="2024-02">Febrero 2024</SelectItem>
                  <SelectItem value="2024-03">Marzo 2024</SelectItem>
                  <SelectItem value="2024-04">Abril 2024</SelectItem>
                  <SelectItem value="2024-05">Mayo 2024</SelectItem>
                  <SelectItem value="2024-06">Junio 2024</SelectItem>
                  <SelectItem value="2024-07">Julio 2024</SelectItem>
                  <SelectItem value="2024-08">Agosto 2024</SelectItem>
                  <SelectItem value="2024-09">Septiembre 2024</SelectItem>
                  <SelectItem value="2024-10">Octubre 2024</SelectItem>
                  <SelectItem value="2024-11">Noviembre 2024</SelectItem>
                  <SelectItem value="2024-12">Diciembre 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Centros */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Restaurantes a Consolidar</label>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedCentres.length === centres?.length
                    ? "Deseleccionar Todos"
                    : "Seleccionar Todos"}
                </Button>
              </div>
              {isLoadingCentres ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                  {centres?.map((centre) => (
                    <div key={centre.id} className="flex items-center gap-2">
                      <Checkbox
                        id={centre.id}
                        checked={selectedCentres.includes(centre.codigo)}
                        onCheckedChange={() => handleCentreToggle(centre.codigo)}
                      />
                      <label
                        htmlFor={centre.id}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {centre.nombre}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {selectedCentres.length} restaurante(s) seleccionado(s)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Consolidados */}
        {selectedCentres.length > 0 && !isLoadingPL && plData && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Ventas Netas</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(ventasNetas?.amount || 0)}€
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">P.A.C.</p>
                <p className={`text-2xl font-bold ${(pac?.amount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(pac?.amount || 0)}€
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.abs(pac?.percentage || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">S.O.I.</p>
                <p className={`text-2xl font-bold ${(soi?.amount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(soi?.amount || 0)}€
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.abs(soi?.percentage || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Resultado Neto</p>
                <p className={`text-2xl font-bold ${(resultadoNeto?.amount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(resultadoNeto?.amount || 0)}€
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.abs(resultadoNeto?.percentage || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabla de P&L Consolidado */}
        <Card>
          <CardHeader>
            <CardTitle>
              P&L Consolidado -{" "}
              {new Date(startDate).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCentres.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Selecciona al menos un restaurante para ver el P&L consolidado
              </div>
            ) : isLoadingPL ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !plData || plData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay datos contables para este periodo
              </div>
            ) : (
              <div className="space-y-1">
                {plData.map((line, idx) => (
                  <div
                    key={`${line.rubric_code}-${idx}`}
                    className={`flex items-center justify-between py-3 px-4 ${
                      line.is_total ? "bg-muted/50 font-semibold" : "hover:bg-accent/30"
                    } ${
                      line.rubric_code === "resultado_neto"
                        ? "bg-primary/5 border-t-2 border-primary mt-2"
                        : ""
                    } ${
                      line.rubric_code === "pac" || line.rubric_code === "soi"
                        ? "border-l-4 border-l-primary"
                        : ""
                    }`}
                    style={{ paddingLeft: `${line.level * 2 + 1}rem` }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span
                        className={`${
                          line.is_total ? "font-semibold text-foreground" : ""
                        } ${line.rubric_code === "resultado_neto" ? "font-bold text-lg" : ""}`}
                      >
                        {line.rubric_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span
                        className={`font-mono font-semibold text-right w-32 ${
                          line.amount >= 0 ? "text-success" : "text-foreground"
                        } ${line.rubric_code === "resultado_neto" ? "text-lg" : ""}`}
                      >
                        {formatCurrency(line.amount)}€
                      </span>
                      <span
                        className={`text-sm text-muted-foreground text-right w-16 ${
                          line.rubric_code === "resultado_neto" ? "font-semibold" : ""
                        }`}
                      >
                        {Math.abs(line.percentage || 0).toFixed(1)}%
                      </span>
                      {line.is_total &&
                        line.rubric_code !== "resultado_neto" && (
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
      </div>
    </div>
  );
};

export default ProfitAndLossConsolidated;
