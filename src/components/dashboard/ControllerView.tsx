import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { AlertsFeed } from "./AlertsFeed";
import { TrendingUp, BarChart3, Target, Award } from "lucide-react";
import { OperationalKPIs } from "@/hooks/useDashboardOperativo";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ControllerViewProps {
  kpis: OperationalKPIs;
}

export const ControllerView = ({ kpis }: ControllerViewProps) => {
  const navigate = useNavigate();

  // Calcular EBITDA estimado
  const ebitda = kpis.monthlySales - kpis.foodCost - kpis.laborCost;
  const ebitdaMargin = kpis.monthlySales > 0 ? (ebitda / kpis.monthlySales) * 100 : 0;

  // Generar alertas para controller
  const alerts = [];

  if (ebitdaMargin < 15) {
    alerts.push({
      id: "ebitda-low",
      type: "critical" as const,
      title: "EBITDA bajo objetivo",
      message: `Margen EBITDA al ${ebitdaMargin.toFixed(1)}% (target: >15%)`,
      timestamp: new Date(),
    });
  }

  if (kpis.ranking && kpis.ranking.length > 0) {
    const underperforming = kpis.ranking.filter(c => c.laborPercentage > 32 || c.foodCostPercentage > 35);
    if (underperforming.length > 0) {
      alerts.push({
        id: "underperforming",
        type: "warning" as const,
        title: "Centros bajo objetivo",
        message: `${underperforming.length} centro(s) con métricas fuera de target`,
        timestamp: new Date(),
      });
    }
  }

  if (kpis.invoicesOverdue > 5) {
    alerts.push({
      id: "cash-risk",
      type: "warning" as const,
      title: "Riesgo de liquidez",
      message: `${kpis.invoicesOverdue} facturas vencidas afectan cash flow`,
      timestamp: new Date(),
      action: { label: "Revisar", route: "/invoices" },
    });
  }

  return (
    <div className="space-y-6">
      {/* KPIs Estratégicos */}
      <div className="grid gap-6 md:grid-cols-4">
        <KPICard
          title="Ventas Totales"
          subtitle="Mes actual"
          value={kpis.monthlySales}
          previousValue={kpis.monthlySales / 1.052}
          icon={TrendingUp}
          format="currency"
        />
        
        <KPICard
          title="EBITDA"
          subtitle="Resultado operativo"
          value={ebitda}
          icon={BarChart3}
          format="currency"
        />
        
        <KPICard
          title="Margen EBITDA"
          subtitle="% sobre ventas"
          value={ebitdaMargin}
          icon={Target}
          format="percentage"
        />
        
        <KPICard
          title="Cumplimiento Cierres"
          subtitle="Del mes"
          value={((kpis.dailyClosures.posted / 30) * 100)}
          icon={Award}
          format="percentage"
        />
      </div>

      {/* Métricas Operativas Consolidadas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">LABOR %</CardTitle>
            <p className="text-sm text-muted-foreground">% sobre ventas consolidado</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${kpis.laborPercentage > 30 ? 'text-destructive' : 'text-green-600'}`}>
                {kpis.laborPercentage.toFixed(1)}%
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-full rounded-full ${kpis.laborPercentage > 30 ? 'bg-destructive' : 'bg-green-600'}`}
                  style={{ width: `${Math.min(kpis.laborPercentage / 35 * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Target: &lt; 30%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">FOOD COST %</CardTitle>
            <p className="text-sm text-muted-foreground">% sobre ventas consolidado</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${kpis.foodCostPercentage > 32 ? 'text-yellow-600' : 'text-green-600'}`}>
                {kpis.foodCostPercentage.toFixed(1)}%
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-full rounded-full ${kpis.foodCostPercentage > 32 ? 'bg-yellow-600' : 'bg-green-600'}`}
                  style={{ width: `${Math.min(kpis.foodCostPercentage / 35 * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Target: &lt; 32%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">OTROS GASTOS</CardTitle>
            <p className="text-sm text-muted-foreground">Resto de operaciones</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                {((100 - kpis.laborPercentage - kpis.foodCostPercentage - ebitdaMargin)).toFixed(1)}%
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${(100 - kpis.laborPercentage - kpis.foodCostPercentage - ebitdaMargin)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Alquileres, utilities, etc.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Estratégicas */}
      <AlertsFeed alerts={alerts} maxItems={6} />

      {/* Ranking de Centros */}
      {kpis.ranking && kpis.ranking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">RANKING INTERCENTROS</CardTitle>
            <p className="text-sm text-muted-foreground">Ordenados por ventas</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posición</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Labor %</TableHead>
                  <TableHead className="text-right">Food Cost %</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.ranking.map((centro, index) => {
                  const isGoodLabor = centro.laborPercentage <= 30;
                  const isGoodFood = centro.foodCostPercentage <= 32;
                  const isGoodOverall = isGoodLabor && isGoodFood;

                  return (
                    <TableRow key={centro.centroCode}>
                      <TableCell className="font-medium">
                        {index + 1}
                        {index === 0 && <Award className="inline-block ml-2 h-4 w-4 text-yellow-500" />}
                      </TableCell>
                      <TableCell>{centro.centroName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {centro.sales.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={isGoodLabor ? "text-green-600" : "text-destructive"}>
                          {centro.laborPercentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={isGoodFood ? "text-green-600" : "text-yellow-600"}>
                          {centro.foodCostPercentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {centro.ebitda.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€
                      </TableCell>
                      <TableCell>
                        <Badge variant={isGoodOverall ? "outline" : "secondary"}>
                          {isGoodOverall ? "On Track" : "Review"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Comparativa Temporal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">EVOLUCIÓN VS AÑO ANTERIOR</CardTitle>
          <p className="text-sm text-muted-foreground">Crecimiento interanual</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ventas</p>
              <p className="text-2xl font-bold text-green-600">+{kpis.salesVsLastYear.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">EBITDA</p>
              <p className="text-2xl font-bold text-green-600">+8.3%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Labor Efficiency</p>
              <p className="text-2xl font-bold text-green-600">+2.1%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Margen</p>
              <p className="text-2xl font-bold text-green-600">+1.5pp</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
