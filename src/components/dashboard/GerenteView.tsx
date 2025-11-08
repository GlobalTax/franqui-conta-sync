import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { AlertsFeed } from "./AlertsFeed";
import { Euro, TrendingUp, Users, ShoppingCart, Clock, Percent } from "lucide-react";
import { OperationalKPIs } from "@/hooks/useDashboardOperativo";
import { useNavigate } from "react-router-dom";

interface GerenteViewProps {
  kpis: OperationalKPIs;
}

export const GerenteView = ({ kpis }: GerenteViewProps) => {
  const navigate = useNavigate();

  // Generar alertas operativas para gerente
  const alerts = [];
  
  if (kpis.arqueoAlerts > 0) {
    alerts.push({
      id: "arqueo-1",
      type: "warning" as const,
      title: "Diferencias en arqueo",
      message: `${kpis.arqueoAlerts} cierre(s) con diferencia > 2%`,
      timestamp: new Date(),
      action: { label: "Revisar", route: "/accounting/daily-closure" },
    });
  }

  if (kpis.laborPercentage > 30) {
    alerts.push({
      id: "labor-1",
      type: "critical" as const,
      title: "Labor % elevado",
      message: `Labor al ${kpis.laborPercentage.toFixed(1)}% (target: <30%)`,
      timestamp: new Date(),
    });
  }

  if (kpis.foodCostPercentage > 32) {
    alerts.push({
      id: "food-1",
      type: "warning" as const,
      title: "Food Cost alto",
      message: `Food Cost al ${kpis.foodCostPercentage.toFixed(1)}% (target: <32%)`,
      timestamp: new Date(),
      action: { label: "Ver gastos", route: "/invoices" },
    });
  }

  if (kpis.dailyClosures.pending > 0) {
    alerts.push({
      id: "closure-1",
      type: "info" as const,
      title: "Cierres pendientes",
      message: `${kpis.dailyClosures.pending} cierre(s) diario(s) sin validar`,
      timestamp: new Date(),
      action: { label: "Validar", route: "/accounting/daily-closure" },
    });
  }

  return (
    <div className="space-y-6">
      {/* KPIs Operativos Principales */}
      <div className="grid gap-6 md:grid-cols-4">
        <KPICard
          title="Ventas Hoy"
          subtitle="Día actual"
          value={kpis.dailySales}
          icon={Euro}
          format="currency"
          actionLabel="Ver detalle"
          onAction={() => navigate("/accounting/daily-closure")}
        />
        
        <KPICard
          title="Ventas Mes"
          subtitle="Acumulado"
          value={kpis.monthlySales}
          previousValue={kpis.monthlySales / 1.05}
          icon={TrendingUp}
          format="currency"
        />
        
        <KPICard
          title="Labor %"
          subtitle="% sobre ventas"
          value={kpis.laborPercentage}
          icon={Users}
          format="percentage"
        />
        
        <KPICard
          title="Food Cost %"
          subtitle="% sobre ventas"
          value={kpis.foodCostPercentage}
          icon={ShoppingCart}
          format="percentage"
        />
      </div>

      {/* Segunda fila de KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        <KPICard
          title="Coste Hora Laboral"
          subtitle="CPLH promedio"
          value={kpis.cplh}
          icon={Clock}
          format="currency"
        />
        
        <KPICard
          title="Margen Bruto"
          subtitle="Ventas - Food Cost - Labor"
          value={kpis.monthlySales - kpis.foodCost - kpis.laborCost}
          icon={Percent}
          format="currency"
        />
        
        <KPICard
          title="Cierres Validados"
          subtitle="Del mes actual"
          value={kpis.dailyClosures.validated + kpis.dailyClosures.posted}
          icon={TrendingUp}
          format="number"
        />
      </div>

      {/* Alertas y Estado Operativo */}
      <div className="grid gap-6 md:grid-cols-2">
        <AlertsFeed alerts={alerts} />

        <div className="rounded-lg border-l-4 border-l-primary bg-muted/30 transition-all duration-200">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">ESTADO CIERRES DIARIOS</h3>
            <p className="text-sm text-muted-foreground">Mes actual</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Pendientes de validar</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {kpis.dailyClosures.pending}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-yellow-600"
                    style={{ 
                      width: `${(kpis.dailyClosures.pending / (kpis.dailyClosures.pending + kpis.dailyClosures.validated + kpis.dailyClosures.posted || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Validados por gerente</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {kpis.dailyClosures.validated}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-blue-600"
                    style={{ 
                      width: `${(kpis.dailyClosures.validated / (kpis.dailyClosures.pending + kpis.dailyClosures.validated + kpis.dailyClosures.posted || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Contabilizados</span>
                  <span className="text-sm font-semibold text-green-600">
                    {kpis.dailyClosures.posted}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-green-600"
                    style={{ 
                      width: `${(kpis.dailyClosures.posted / (kpis.dailyClosures.pending + kpis.dailyClosures.validated + kpis.dailyClosures.posted || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Labor Detalladas */}
      <div className="rounded-lg border-l-4 border-l-accent bg-muted/30 transition-all duration-200">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">ANÁLISIS LABOR</h3>
          <p className="text-sm text-muted-foreground">Métricas del mes actual</p>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Coste Total Labor</p>
              <p className="text-2xl font-bold">
                {kpis.laborCost.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Horas Trabajadas</p>
              <p className="text-2xl font-bold">
                {kpis.laborHours.toLocaleString("es-ES", { minimumFractionDigits: 0 })}h
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">% sobre Ventas</p>
              <p className={`text-2xl font-bold ${kpis.laborPercentage > 30 ? 'text-destructive' : 'text-green-600'}`}>
                {kpis.laborPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
