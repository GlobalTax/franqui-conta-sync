import { useState } from "react";
import { useView } from "@/contexts/ViewContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { useConsolidatedReports } from "@/hooks/useConsolidatedReports";
import { EvolutionComposedChart } from "@/components/reports/EvolutionComposedChart";
import { RankingCards } from "@/components/reports/RankingCards";
import { KPISummaryTable } from "@/components/reports/KPISummaryTable";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, getPeriodOptions, getPeriodDates } from "@/lib/reports-utils";

export default function ConsolidatedReports() {
  const { selectedView } = useView();
  const [selectedPeriod, setSelectedPeriod] = useState("2024-Q1");
  const [sortConfig, setSortConfig] = useState({ key: "sales", direction: "desc" as "asc" | "desc" });

  const periodDates = getPeriodDates(selectedPeriod);
  const { data, isLoading } = useConsolidatedReports(selectedView, periodDates);

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "desc" ? "asc" : "desc",
    });
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    console.log("Exporting to Excel...");
  };

  if (!selectedView) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Selecciona una vista para ver los reportes</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Reportes", href: "/reportes" },
          { label: "Consolidado" },
        ]}
        title="Reportes Consolidados"
        subtitle="Análisis comparativo multi-centro"
        actions={
          <Button onClick={handleExport} variant="outline" className="quantum-button">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        }
      />

      {/* Filters */}
      <Card className="quantum-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="quantum-header mb-2 block">Periodo</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPeriodOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="quantum-card">
          <CardHeader className="pb-3">
            <CardTitle className="quantum-header flex items-center gap-2">
              <DollarSign className="h-4 w-4" strokeWidth={1.5} />
              Ventas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="quantum-value">{formatCurrency(data?.aggregated.totalSales || 0)}</p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.3% vs periodo anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="quantum-card">
          <CardHeader className="pb-3">
            <CardTitle className="quantum-header flex items-center gap-2">
              <Percent className="h-4 w-4" strokeWidth={1.5} />
              EBITDA Medio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="quantum-value">{formatPercent(data?.aggregated.avgEBITDA || 0)}</p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +2.1pp vs periodo anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="quantum-card">
          <CardHeader className="pb-3">
            <CardTitle className="quantum-header flex items-center gap-2">
              <Percent className="h-4 w-4" strokeWidth={1.5} />
              Food Cost Medio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="quantum-value">{formatPercent(data?.aggregated.avgFoodCost || 0)}</p>
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  +1.2pp vs periodo anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="quantum-card">
          <CardHeader className="pb-3">
            <CardTitle className="quantum-header flex items-center gap-2">
              <Percent className="h-4 w-4" strokeWidth={1.5} />
              Labor Medio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="quantum-value">{formatPercent(data?.aggregated.avgLabor || 0)}</p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  -0.8pp vs periodo anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolution Chart */}
      <EvolutionComposedChart 
        data={data?.monthlyEvolution || []} 
        isLoading={isLoading} 
      />

      {/* Ranking Cards */}
      <RankingCards 
        rankings={data?.rankings || { byEBITDA: [], byLabor: [], byMargin: [] }} 
        isLoading={isLoading}
      />

      {/* KPI Summary Table */}
      <KPISummaryTable
        data={data?.centreData || []}
        onSort={handleSort}
        sortConfig={sortConfig}
        isLoading={isLoading}
      />
    </div>
  );
}
