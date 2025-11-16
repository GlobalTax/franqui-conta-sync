import { KPICard } from '@/components/accounting/KPICard';
import { useDigitizationMetricsDefault } from '@/hooks/useDigitizationMetrics';
import { Coins, Clock, TrendingUp, FileText } from 'lucide-react';

export function OCRMetricsCards() {
  const { data: metrics, isLoading } = useDigitizationMetricsDefault();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-card/30 rounded-lg border border-border/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const totalCost = metrics?.total_cost_eur || 0;
  const avgCost = metrics?.total_invoices ? totalCost / metrics.total_invoices : 0;
  const avgTime = metrics?.avg_processing_time_sec || 0;
  const autoPostRate = metrics?.auto_post_rate || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Coste Total OCR"
        value={totalCost}
        format="currency"
        subtitle={`${metrics?.total_invoices || 0} facturas procesadas`}
        icon={Coins}
        variant={totalCost > 100 ? 'warning' : 'default'}
      />

      <KPICard
        title="Coste Promedio"
        value={avgCost}
        format="currency"
        subtitle="Por factura digitalizada"
        icon={FileText}
        variant="default"
      />

      <KPICard
        title="Tiempo de Procesamiento"
        value={avgTime}
        subtitle="Segundos promedio"
        icon={Clock}
        variant={avgTime > 10 ? 'warning' : 'success'}
      />

      <KPICard
        title="Tasa Auto-Posting"
        value={autoPostRate}
        format="percentage"
        subtitle="Facturas auto-contabilizadas"
        icon={TrendingUp}
        variant={autoPostRate >= 80 ? 'success' : autoPostRate >= 60 ? 'warning' : 'default'}
      />
    </div>
  );
}
