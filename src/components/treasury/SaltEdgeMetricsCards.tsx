import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

interface MetricsCardsProps {
  activeConnections: number;
  todayTransactions: number;
  recentErrors: number;
  connectedAccounts: number;
  isLoading?: boolean;
}

export function SaltEdgeMetricsCards({ 
  activeConnections, 
  todayTransactions, 
  recentErrors,
  connectedAccounts,
  isLoading 
}: MetricsCardsProps) {
  const metrics = [
    {
      title: "Conexiones Activas",
      value: activeConnections,
      icon: CheckCircle,
      iconColor: "text-green-600",
      description: "Bancos conectados activamente"
    },
    {
      title: "Transacciones Hoy",
      value: todayTransactions,
      icon: TrendingUp,
      iconColor: "text-primary",
      description: "Importadas desde las 00:00"
    },
    {
      title: "Errores Recientes",
      value: recentErrors,
      icon: AlertCircle,
      iconColor: recentErrors > 0 ? "text-destructive" : "text-muted-foreground",
      borderColor: recentErrors > 0 ? "border-destructive/50" : undefined,
      description: "Últimos 7 días"
    },
    {
      title: "Cuentas Conectadas",
      value: connectedAccounts,
      icon: Activity,
      iconColor: "text-primary",
      description: "Cuentas bancarias activas"
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title} className={metric.borderColor}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.iconColor}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse bg-muted rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
