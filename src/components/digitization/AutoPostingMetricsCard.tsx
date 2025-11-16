import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export function AutoPostingMetricsCard() {
  const { data: metrics } = useQuery({
    queryKey: ['auto-posting-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_auto_posting_metrics');
      
      if (error) throw error;
      return data as Array<{
        date: string;
        total_invoices: number;
        auto_posted_count: number;
        manual_review_count: number;
        avg_confidence: number;
        auto_post_rate_percent: number;
      }>;
    },
    refetchInterval: 30000,
  });

  if (!metrics || metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Auto-Posting Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay datos disponibles aún.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalInvoices = metrics.reduce((sum, m) => sum + m.total_invoices, 0);
  const totalAutoPosted = metrics.reduce((sum, m) => sum + m.auto_posted_count, 0);
  const avgAutoPostRate = Math.round(
    metrics.reduce((sum, m) => sum + (m.auto_post_rate_percent || 0), 0) / metrics.length
  );
  const avgConfidence = Math.round(
    metrics.reduce((sum, m) => sum + (m.avg_confidence || 0), 0) / metrics.length
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Auto-Posting Performance (30 días)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Auto-posted
            </p>
            <p className="text-2xl font-bold text-green-600">
              {totalAutoPosted}
              <span className="text-sm text-muted-foreground ml-1">
                / {totalInvoices}
              </span>
            </p>
            <Badge variant="secondary" className="text-xs">
              {avgAutoPostRate}% rate
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Manual Review
            </p>
            <p className="text-2xl font-bold text-orange-600">
              {totalInvoices - totalAutoPosted}
            </p>
            <Badge variant="secondary" className="text-xs">
              {100 - avgAutoPostRate}% rate
            </Badge>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Avg Confidence
            </p>
            <p className="text-lg font-bold">{avgConfidence}%</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Últimos 7 días</p>
          <div className="space-y-1">
            {metrics.slice(0, 7).map((m) => (
              <div key={m.date} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {new Date(m.date).toLocaleDateString('es-ES', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <span className="font-medium">
                  {m.auto_posted_count}/{m.total_invoices}
                  <span className="text-muted-foreground ml-1">
                    ({m.auto_post_rate_percent}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
