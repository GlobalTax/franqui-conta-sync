import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: Date;
  action?: {
    label: string;
    route: string;
  };
}

interface AlertsFeedProps {
  alerts: Alert[];
  maxItems?: number;
}

export const AlertsFeed = ({ alerts, maxItems = 5 }: AlertsFeedProps) => {
  const navigate = useNavigate();

  const displayAlerts = alerts.slice(0, maxItems);

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getBadgeVariant = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (displayAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">ALERTAS OPERATIVAS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
            <p className="text-sm">No hay alertas pendientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">ALERTAS OPERATIVAS</CardTitle>
        <p className="text-sm text-muted-foreground">
          {displayAlerts.length} alerta{displayAlerts.length !== 1 ? "s" : ""} activa{displayAlerts.length !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="mt-0.5">{getIcon(alert.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <Badge variant={getBadgeVariant(alert.type)} className="text-xs">
                    {alert.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.timestamp.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {alert.action && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(alert.action!.route)}
                >
                  {alert.action.label}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
