// ============================================================================
// OCR ENGINE METRICS DASHBOARD
// Shows statistics about OCR engine usage and performance
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Cpu, TrendingUp, DollarSign } from 'lucide-react';

export function OCREngineMetrics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['ocr-engine-metrics'],
    queryFn: async () => {
      // Get last 100 OCR processing logs
      const { data, error } = await supabase
        .from('ocr_processing_log')
        .select('engine, confidence, cost_estimate_eur, processing_time_ms')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const openaiCount = data.filter(l => l.engine === 'openai').length;
      const totalCost = data.reduce((sum, l) => sum + (l.cost_estimate_eur || 0), 0);
      const avgConfidence = data.reduce((sum, l) => sum + (l.confidence || 0), 0) / data.length;

      return {
        total: data.length,
        openai_count: openaiCount,
        total_cost: totalCost,
        avg_confidence: avgConfidence * 100,
      };
    },
    refetchInterval: 30000 // Refresh every 30s
  });

  if (isLoading || !metrics) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Estadísticas OCR
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Motor OCR</p>
            <div className="flex items-center gap-2 mt-1">
              <Brain className="h-4 w-4 text-green-600" />
              <Badge variant="secondary">OpenAI</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Coste total (últimas 100)</p>
            <div className="flex items-center gap-2 mt-1">
              <DollarSign className="h-4 w-4 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">
                €{metrics.total_cost.toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Confianza promedio</p>
            <p className="text-2xl font-bold text-primary">
              {Math.round(metrics.avg_confidence)}%
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Documentos procesados</p>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              <span>OpenAI: {metrics.openai_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Total: {metrics.total}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
