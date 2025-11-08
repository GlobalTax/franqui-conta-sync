import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { useDQStats } from "@/hooks/useDQIssues";
import { format, subDays } from "date-fns";

export default function DataQualityDashboard() {
  const { data: stats } = useDQStats(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
    format(new Date(), "yyyy-MM-dd")
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard de Calidad de Datos</h2>
        <p className="text-muted-foreground mt-2">
          Monitoreo y análisis de la calidad de los datos
        </p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Activos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActivos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Problemas sin resolver
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Críticos</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.criticos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Resolución</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tasaResolucion || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Medio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tiempo de resolución
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Calidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Dashboard en Desarrollo</p>
            <p className="text-sm mt-2">
              Los gráficos y análisis detallados estarán disponibles próximamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
