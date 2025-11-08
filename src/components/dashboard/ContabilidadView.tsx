import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { AlertsFeed } from "./AlertsFeed";
import { FileText, CheckCircle, Clock, CreditCard, AlertCircle } from "lucide-react";
import { OperationalKPIs } from "@/hooks/useDashboardOperativo";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContabilidadViewProps {
  kpis: OperationalKPIs;
}

export const ContabilidadView = ({ kpis }: ContabilidadViewProps) => {
  const navigate = useNavigate();

  // Generar alertas para contabilidad
  const alerts = [];

  if (kpis.invoicesOverdue > 0) {
    alerts.push({
      id: "invoice-overdue",
      type: "critical" as const,
      title: "Facturas vencidas",
      message: `${kpis.invoicesOverdue} factura(s) vencida(s) sin pagar`,
      timestamp: new Date(),
      action: { label: "Revisar", route: "/invoices" },
    });
  }

  if (kpis.invoicesApprovalNeeded > 0) {
    alerts.push({
      id: "invoice-approval",
      type: "warning" as const,
      title: "Facturas pendientes de aprobación",
      message: `${kpis.invoicesApprovalNeeded} factura(s) necesitan validación`,
      timestamp: new Date(),
      action: { label: "Aprobar", route: "/invoices" },
    });
  }

  if (kpis.dailyClosures.validated > 0) {
    alerts.push({
      id: "closures-pending",
      type: "info" as const,
      title: "Cierres por contabilizar",
      message: `${kpis.dailyClosures.validated} cierre(s) validado(s) por gerente`,
      timestamp: new Date(),
      action: { label: "Contabilizar", route: "/accounting/daily-closure" },
    });
  }

  if (kpis.unreconciledTransactions > 10) {
    alerts.push({
      id: "recon-pending",
      type: "warning" as const,
      title: "Conciliación pendiente",
      message: `${kpis.unreconciledTransactions} movimientos bancarios sin conciliar`,
      timestamp: new Date(),
      action: { label: "Conciliar", route: "/banks" },
    });
  }

  return (
    <div className="space-y-6">
      {/* KPIs de Contabilidad */}
      <div className="grid gap-6 md:grid-cols-4">
        <KPICard
          title="Facturas Pendientes"
          subtitle="Por aprobar"
          value={kpis.invoicesApprovalNeeded}
          icon={FileText}
          format="number"
          actionLabel="Aprobar"
          onAction={() => navigate("/invoices")}
        />
        
        <KPICard
          title="Cierres por Contabilizar"
          subtitle="Validados"
          value={kpis.dailyClosures.validated}
          icon={CheckCircle}
          format="number"
          actionLabel="Contabilizar"
          onAction={() => navigate("/accounting/daily-closure")}
        />
        
        <KPICard
          title="Facturas Vencidas"
          subtitle="Sin pagar"
          value={kpis.invoicesOverdue}
          icon={Clock}
          format="number"
        />
        
        <KPICard
          title="Tasa Conciliación"
          subtitle="Bancaria"
          value={kpis.reconciliationRate}
          icon={CreditCard}
          format="percentage"
        />
      </div>

      {/* Estado de Workflow */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">FLUJO DE APROBACIÓN</CardTitle>
            <p className="text-sm text-muted-foreground">Estado actual de facturas</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pendientes</p>
                    <p className="text-xs text-muted-foreground">Esperando aprobación</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {kpis.invoicesPending}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Aprobadas</p>
                    <p className="text-xs text-muted-foreground">Listas para pagar</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg font-bold">
                  {kpis.invoicesApprovalNeeded}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vencidas</p>
                    <p className="text-xs text-muted-foreground">Requieren atención</p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg font-bold">
                  {kpis.invoicesOverdue}
                </Badge>
              </div>
            </div>

            <Button 
              className="w-full mt-4"
              onClick={() => navigate("/invoices")}
            >
              Gestionar Facturas
            </Button>
          </CardContent>
        </Card>

        <AlertsFeed alerts={alerts} />
      </div>

      {/* Cierres Diarios por Periodo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">ESTADO CIERRES CONTABLES</CardTitle>
          <p className="text-sm text-muted-foreground">Pipeline de cierre mes actual</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Validados por Gerente</span>
                  <span className="text-sm font-semibold">{kpis.dailyClosures.validated}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${(kpis.dailyClosures.validated / 30) * 100}%` }}
                  />
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="ml-4"
                onClick={() => navigate("/accounting/daily-closure")}
              >
                Contabilizar
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Contabilizados</span>
                  <span className="text-sm font-semibold">{kpis.dailyClosures.posted}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-full rounded-full bg-green-600"
                    style={{ width: `${(kpis.dailyClosures.posted / 30) * 100}%` }}
                  />
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="ml-4"
                onClick={() => navigate("/accounting/daily-closure")}
              >
                Ver
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Pendientes de Gerente</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {kpis.dailyClosures.pending}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-full rounded-full bg-yellow-600"
                    style={{ width: `${(kpis.dailyClosures.pending / 30) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conciliación Bancaria */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">CONCILIACIÓN BANCARIA</CardTitle>
            <p className="text-sm text-muted-foreground">Estado actual</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tasa de conciliación</span>
                  <span className="font-bold">{kpis.reconciliationRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      kpis.reconciliationRate >= 90 
                        ? 'bg-green-600' 
                        : kpis.reconciliationRate >= 70 
                        ? 'bg-yellow-600' 
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${kpis.reconciliationRate}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Sin conciliar</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {kpis.unreconciledTransactions}
                  </span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-4"
              variant="outline"
              onClick={() => navigate("/banks")}
            >
              Conciliar Movimientos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">SALDO BANCARIO TOTAL</CardTitle>
            <p className="text-sm text-muted-foreground">Posición consolidada</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-4xl font-bold">
                  {kpis.bankBalance.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€
                </p>
                <p className="text-sm text-muted-foreground mt-2">Saldo total cuentas</p>
              </div>
            </div>

            <Button 
              className="w-full"
              variant="outline"
              onClick={() => navigate("/banks")}
            >
              Ver Detalle Bancario
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
