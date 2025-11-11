import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ErrorsPanelProps {
  errors: Array<{
    id: string;
    started_at: string;
    sync_type: string;
    error_message: string | null;
  }>;
}

export function SaltEdgeErrorsPanel({ errors }: ErrorsPanelProps) {
  if (errors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Errores Recientes
          </CardTitle>
          <CardDescription>Últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            No hay errores recientes
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Errores Recientes
        </CardTitle>
        <CardDescription>{errors.length} errores en los últimos 7 días</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {errors.map((error) => (
            <div
              key={error.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5"
            >
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {error.sync_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(error.started_at), "dd MMM, HH:mm", { locale: es })}
                  </span>
                </div>
                <p className="text-sm text-destructive">
                  {error.error_message || "Error desconocido"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
