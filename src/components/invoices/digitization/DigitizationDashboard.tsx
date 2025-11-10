import { 
  Zap, 
  DollarSign, 
  Target, 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2 
} from "lucide-react";
import { KPICard } from "@/components/accounting/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDigitizationMetricsDefault } from "@/hooks/useDigitizationMetrics";

interface DigitizationDashboardProps {
  centroCode?: string | null;
}

export function DigitizationDashboard({ centroCode }: DigitizationDashboardProps) {
  const { data: metrics, isLoading, isError } = useDigitizationMetricsDefault(centroCode);

  // ========================================================================
  // LOADING STATE
  // ========================================================================
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ========================================================================
  // ERROR STATE
  // ========================================================================
  if (isError || !metrics) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Error al cargar métricas
          </CardTitle>
          <CardDescription>
            No se pudieron obtener las métricas de digitalización. Intenta recargar la página.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // ========================================================================
  // EMPTY STATE
  // ========================================================================
  if (metrics.total_invoices === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Digitalización OCR</CardTitle>
          <CardDescription>
            No hay facturas procesadas en los últimos 30 días.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Zap className="h-12 w-12 mb-4 opacity-50" />
          <p>Sube tu primera factura para ver métricas de OCR.</p>
        </CardContent>
      </Card>
    );
  }

  // ========================================================================
  // MÉTRICAS DERIVADAS
  // ========================================================================
  const estimatedSavingsMin = Math.round(
    (metrics.total_invoices * metrics.auto_post_rate / 100) * 3
  );
  const costPerInvoice = metrics.total_invoices > 0 
    ? metrics.total_cost_eur / metrics.total_invoices 
    : 0;

  // Variantes de color según umbrales
  const confidenceVariant = 
    metrics.avg_confidence >= 85 ? 'success' : 
    metrics.avg_confidence >= 70 ? 'warning' : 
    'danger';

  const autoPostVariant = 
    metrics.auto_post_rate >= 70 ? 'success' : 
    metrics.auto_post_rate >= 50 ? 'warning' : 
    'danger';

  const fallbackVariant = 
    metrics.fallback_rate <= 10 ? 'success' : 
    metrics.fallback_rate <= 30 ? 'warning' : 
    'danger';

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard de Digitalización OCR</h2>
        <p className="text-muted-foreground">
          Métricas de los últimos 30 días · {metrics.total_invoices.toLocaleString('es-ES')} facturas procesadas
        </p>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. COSTE TOTAL OCR */}
        <KPICard
          title="Coste OCR Total"
          value={metrics.total_cost_eur}
          subtitle={`${costPerInvoice.toFixed(3)}€/factura`}
          icon={DollarSign}
          format="currency"
          variant="default"
        />

        {/* 2. CONFIANZA MEDIA */}
        <KPICard
          title="Confianza Media"
          value={metrics.avg_confidence}
          subtitle={`${metrics.low_confidence_count} facturas <70%`}
          icon={Target}
          format="percentage"
          variant={confidenceVariant}
        />

        {/* 3. TIEMPO PROCESAMIENTO */}
        <KPICard
          title="Tiempo Procesamiento"
          value={`${metrics.avg_processing_time_sec.toFixed(1)}s`}
          subtitle="Promedio por factura"
          icon={Clock}
          variant="default"
        />

        {/* 4. AUTO-POST RATE */}
        <KPICard
          title="Auto-Post Rate"
          value={metrics.auto_post_rate}
          subtitle="Facturas sin correcciones"
          icon={Zap}
          format="percentage"
          variant={autoPostVariant}
        />

        {/* 5. FALLBACK RATE (Mindee) */}
        <KPICard
          title="Fallback Rate"
          value={metrics.fallback_rate}
          subtitle={`${metrics.cost_mindee.toFixed(2)}€ en Mindee`}
          icon={RefreshCw}
          format="percentage"
          variant={fallbackVariant}
        />

        {/* 6. TASA CONTABILIZACIÓN */}
        <KPICard
          title="Tasa Contabilización"
          value={metrics.post_rate}
          subtitle="Facturas contabilizadas"
          icon={CheckCircle2}
          format="percentage"
          variant={metrics.post_rate >= 80 ? 'success' : 'warning'}
        />

        {/* 7. AHORRO ESTIMADO (card custom) */}
        <Card className="border-border/40 bg-gradient-to-br from-success/5 to-success/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ahorro Estimado
              </CardTitle>
              <Zap className="h-5 w-5 text-success" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-1">
              {estimatedSavingsMin.toLocaleString('es-ES')} min
            </div>
            <p className="text-xs text-muted-foreground">
              3 min/factura automatizada
            </p>
          </CardContent>
        </Card>

        {/* 8. DESGLOSE COSTE (card custom con 2 líneas) */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Desglose Coste
              </CardTitle>
              <DollarSign className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">OpenAI</span>
              <span className="text-sm font-semibold">
                {metrics.cost_openai.toFixed(2)}€
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-sm text-muted-foreground">Mindee</span>
              <span className="text-sm font-semibold">
                {metrics.cost_mindee.toFixed(2)}€
              </span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
