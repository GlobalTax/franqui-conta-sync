import { useFiscalYearDashboard } from "@/hooks/useFiscalYearDashboard";
import { KPICard } from "@/components/accounting/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Building2, Receipt, Landmark, ChevronDown, RefreshCw, Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface FiscalYearDashboardProps {
  fiscalYearId: string;
}

export function FiscalYearDashboard({ fiscalYearId }: FiscalYearDashboardProps) {
  const { data, isLoading, error, refetch } = useFiscalYearDashboard(fiscalYearId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState({
    apertura: false,
    diario: true,
    iva: true,
    bancos: true,
    cierre: false,
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["fiscal-year-dashboard"] });
    refetch();
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error al cargar dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.monthlyBreakdown.map((item) => ({
    name: new Date(item.month + "-01").toLocaleDateString("es-ES", { month: "short" }),
    asientos: item.entries,
    debe: Number(item.debit) / 1000,
    haber: Number(item.credit) / 1000,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dashboard: Ejercicio Fiscal {data.overview.year}
              </CardTitle>
              <CardDescription>
                {data.overview.centroCode} · Estado: {data.overview.status.toUpperCase()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refrescar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Asientos Contables"
          value={data.accounting.totalEntries}
          icon={FileText}
          variant="default"
          format="number"
        />
        
        <KPICard
          title="Balance"
          value={data.accounting.isBalanced ? "Cuadrado" : "Descuadrado"}
          subtitle={`Diferencia: ${data.accounting.balanceDifference.toFixed(2)}€`}
          icon={data.accounting.isBalanced ? CheckCircle2 : AlertTriangle}
          variant={data.accounting.isBalanced ? "success" : "warning"}
        />
        
        <KPICard
          title="IVA Neto"
          value={data.vat.netVAT}
          subtitle={data.vat.netVAT > 0 ? "A pagar" : "A devolver"}
          icon={Receipt}
          variant={data.vat.netVAT > 0 ? "default" : "success"}
          format="currency"
        />
        
        <KPICard
          title="Movimientos Bancarios"
          value={data.banking.movementsCount}
          subtitle={`Total: ${data.banking.movementsTotal.toLocaleString("es-ES")}€`}
          icon={Landmark}
          variant="default"
          format="number"
        />
        
        <KPICard
          title="Advertencias"
          value={data.migration.warningsCount}
          icon={AlertTriangle}
          variant={data.migration.warningsCount > 0 ? "warning" : "success"}
          format="number"
        />
        
        <KPICard
          title="Errores"
          value={data.migration.errorsCount}
          icon={XCircle}
          variant={data.migration.errorsCount > 0 ? "error" : "success"}
          format="number"
        />
      </div>

      {/* Monthly Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolución Mensual de Asientos
          </CardTitle>
          <CardDescription>
            Número de asientos contabilizados por mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar 
                dataKey="asientos" 
                fill="hsl(var(--primary))" 
                name="Asientos"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles por Sección</CardTitle>
          <CardDescription>
            Información detallada de cada fase de migración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Diario */}
          <Collapsible
            open={expandedSections.diario}
            onOpenChange={(open) => setExpandedSections({ ...expandedSections, diario: open })}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border p-4 hover:bg-accent">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Diario General</p>
                  <p className="text-sm text-muted-foreground">
                    {data.accounting.totalEntries} asientos importados
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.diario ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-lg border border-border bg-card/30 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Debe:</span>
                  <span className="font-semibold">{data.accounting.totalDebit.toLocaleString("es-ES")}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Haber:</span>
                  <span className="font-semibold">{data.accounting.totalCredit.toLocaleString("es-ES")}€</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className={`font-semibold ${data.accounting.isBalanced ? "text-success" : "text-destructive"}`}>
                    {data.accounting.isBalanced ? "✅ Cuadrado" : "⚠️ Descuadrado"}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={() => navigate(`/contabilidad/asientos?fiscal_year=${fiscalYearId}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver asientos
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* IVA */}
          <Collapsible
            open={expandedSections.iva}
            onOpenChange={(open) => setExpandedSections({ ...expandedSections, iva: open })}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border p-4 hover:bg-accent">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Libros IVA</p>
                  <p className="text-sm text-muted-foreground">
                    {data.vat.emitidas.count + data.vat.recibidas.count} facturas registradas
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.iva ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-lg border border-border bg-card/30 p-4">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">🧾 Facturas Emitidas</p>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cantidad:</span>
                      <span>{data.vat.emitidas.count} facturas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base imponible:</span>
                      <span>{data.vat.emitidas.base.toLocaleString("es-ES")}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA repercutido:</span>
                      <span className="font-semibold">{data.vat.emitidas.vat.toLocaleString("es-ES")}€</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-3">
                  <p className="font-semibold mb-2">🧾 Facturas Recibidas</p>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cantidad:</span>
                      <span>{data.vat.recibidas.count} facturas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base imponible:</span>
                      <span>{data.vat.recibidas.base.toLocaleString("es-ES")}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA soportado:</span>
                      <span className="font-semibold">{data.vat.recibidas.vat.toLocaleString("es-ES")}€</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">IVA Neto:</span>
                    <span className={`font-bold text-lg ${data.vat.netVAT > 0 ? "text-destructive" : "text-success"}`}>
                      {data.vat.netVAT.toLocaleString("es-ES")}€
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.vat.netVAT > 0 ? "A pagar a Hacienda" : "A devolver por Hacienda"}
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Bancos */}
          <Collapsible
            open={expandedSections.bancos}
            onOpenChange={(open) => setExpandedSections({ ...expandedSections, bancos: open })}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border p-4 hover:bg-accent">
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Conciliación Bancaria</p>
                  <p className="text-sm text-muted-foreground">
                    {data.banking.movementsCount} movimientos
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.bancos ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-lg border border-border bg-card/30 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Movimientos importados:</span>
                  <span className="font-semibold">{data.banking.movementsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total movimientos:</span>
                  <span className="font-semibold">{data.banking.movementsTotal.toLocaleString("es-ES")}€</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Cierre */}
          {data.overview.status === "closed" && (
            <Collapsible
              open={expandedSections.cierre}
              onOpenChange={(open) => setExpandedSections({ ...expandedSections, cierre: open })}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-success/50 bg-success/5 p-4 hover:bg-success/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div className="text-left">
                    <p className="font-semibold text-success">Ejercicio Cerrado</p>
                    <p className="text-sm text-muted-foreground">
                      Cerrado el {data.overview.closingDate ? new Date(data.overview.closingDate).toLocaleDateString("es-ES") : "-"}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.cierre ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-lg border border-border bg-card/30 p-4">
                <div className="space-y-2 text-sm">
                  <p className="text-success">✅ Todas las validaciones pasadas</p>
                  <p className="text-muted-foreground">El ejercicio ha sido cerrado correctamente.</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
