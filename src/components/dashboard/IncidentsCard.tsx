import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, CheckCircle2, DollarSign, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IncidentsCardProps {
  incidents: {
    overdueInvoices: number;
    pendingClosures: number;
    auditDifferences: number;
    unreconciledTransactions: number;
    pendingApprovals: number;
  };
}

export function IncidentsCard({ incidents }: IncidentsCardProps) {
  const navigate = useNavigate();

  const allIncidents = [
    {
      icon: DollarSign,
      title: "Facturas Vencidas",
      count: incidents.overdueInvoices,
      severity: "error" as const,
      route: "/facturas/recibidas",
      message: `${incidents.overdueInvoices} factura${incidents.overdueInvoices !== 1 ? 's' : ''} sin pagar`,
    },
    {
      icon: FileText,
      title: "Cierres Pendientes",
      count: incidents.pendingClosures,
      severity: "warning" as const,
      route: "/accounting/daily-closure",
      message: `${incidents.pendingClosures} día${incidents.pendingClosures !== 1 ? 's' : ''} sin validar`,
    },
    {
      icon: AlertTriangle,
      title: "Diferencias Arqueo",
      count: incidents.auditDifferences,
      severity: "error" as const,
      route: "/accounting/daily-closure",
      message: "Revisar arqueo de caja",
    },
    {
      icon: Clock,
      title: "Conciliación Pendiente",
      count: incidents.unreconciledTransactions,
      severity: "warning" as const,
      route: "/bancos",
      message: `${incidents.unreconciledTransactions} transacción${incidents.unreconciledTransactions !== 1 ? 'es' : ''} sin conciliar`,
    },
    {
      icon: CheckCircle2,
      title: "Aprobaciones Pendientes",
      count: incidents.pendingApprovals,
      severity: "info" as const,
      route: "/facturas/recibidas",
      message: `${incidents.pendingApprovals} factura${incidents.pendingApprovals !== 1 ? 's' : ''} por aprobar`,
    },
  ];

  const activeIncidents = allIncidents.filter(inc => inc.count > 0);
  const totalIncidents = activeIncidents.reduce((sum, inc) => sum + inc.count, 0);

  const getSeverityBadge = (severity: "error" | "warning" | "info") => {
    const variants = {
      error: "destructive" as const,
      warning: "outline" as const,
      info: "secondary" as const,
    };
    return variants[severity];
  };

  return (
    <Card className="border-border/40 hover:border-border transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={1.5} />
          Incidencias
        </CardTitle>
        {totalIncidents > 0 && (
          <Badge variant="outline" className="font-semibold">
            {totalIncidents} {totalIncidents === 1 ? 'incidencia' : 'incidencias'}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {activeIncidents.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-success">Todo OK</p>
              <p className="text-sm text-muted-foreground">No hay incidencias pendientes</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeIncidents.slice(0, 5).map((incident, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:border-border transition-colors cursor-pointer group"
                onClick={() => navigate(incident.route)}
              >
                <div className={`p-2 rounded-full ${
                  incident.severity === 'error' ? 'bg-destructive/10' :
                  incident.severity === 'warning' ? 'bg-warning/10' :
                  'bg-secondary/50'
                }`}>
                  <incident.icon className={`h-4 w-4 ${
                    incident.severity === 'error' ? 'text-destructive' :
                    incident.severity === 'warning' ? 'text-warning' :
                    'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{incident.title}</p>
                    <Badge variant={getSeverityBadge(incident.severity)} className="text-xs">
                      {incident.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{incident.message}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
