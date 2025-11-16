import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAutoPostingEvolution } from '@/hooks/useAutoPostingAnalytics';
import { useState } from 'react';
import { useChartColors } from '@/lib/chart-theme-utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function AutoPostingEvolutionChart() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const { data: evolution, isLoading } = useAutoPostingEvolution(Number(period));
  const chartColors = useChartColors();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Auto-Posting</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </CardContent>
      </Card>
    );
  }

  if (!evolution || evolution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Auto-Posting</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  // Calcular tendencia
  const firstRate = evolution[0]?.auto_post_rate || 0;
  const lastRate = evolution[evolution.length - 1]?.auto_post_rate || 0;
  const trend = lastRate - firstRate;
  const isPositiveTrend = trend >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Evolución de Auto-Posting</CardTitle>
            <CardDescription className="flex items-center gap-2">
              Tasa de auto-posting y confianza en el tiempo
              {isPositiveTrend ? (
                <span className="flex items-center gap-1 text-success text-xs">
                  <TrendingUp className="h-3 w-3" />
                  +{trend.toFixed(1)}%
                </span>
              ) : (
                <span className="flex items-center gap-1 text-destructive text-xs">
                  <TrendingDown className="h-3 w-3" />
                  {trend.toFixed(1)}%
                </span>
              )}
            </CardDescription>
          </div>
          <Select value={period} onValueChange={(val) => setPeriod(val as '7' | '30' | '90')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={evolution}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis
              dataKey="date"
              stroke={chartColors.axis}
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke={chartColors.axis} fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
              formatter={(value: number, name: string) => {
                if (name === 'auto_post_rate') return [`${value.toFixed(1)}%`, 'Tasa Auto-Posting'];
                if (name === 'avg_confidence') return [`${value.toFixed(1)}%`, 'Confianza Promedio'];
                return [value, name];
              }}
            />
            <Legend
              formatter={(value) => {
                if (value === 'auto_post_rate') return 'Tasa Auto-Posting (%)';
                if (value === 'avg_confidence') return 'Confianza Promedio (%)';
                return value;
              }}
            />
            <Line
              type="monotone"
              dataKey="auto_post_rate"
              stroke={chartColors.lines.primary}
              strokeWidth={chartColors.strokeWidth}
              dot={{ r: chartColors.dotRadius }}
              name="auto_post_rate"
            />
            <Line
              type="monotone"
              dataKey="avg_confidence"
              stroke={chartColors.lines.secondary}
              strokeWidth={chartColors.strokeWidth}
              dot={{ r: chartColors.dotRadius }}
              name="avg_confidence"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
