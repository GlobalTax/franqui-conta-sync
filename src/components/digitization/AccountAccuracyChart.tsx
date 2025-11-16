import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAccountAccuracy } from '@/hooks/useAutoPostingAnalytics';
import { useChartColors } from '@/lib/chart-theme-utils';

export function AccountAccuracyChart() {
  const { data: accuracy, isLoading } = useAccountAccuracy();
  const chartColors = useChartColors();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Precisión por Tipo de Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </CardContent>
      </Card>
    );
  }

  if (!accuracy || accuracy.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Precisión por Tipo de Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay datos de precisión</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = accuracy.map((acc) => ({
    name: acc.account_group_name,
    value: acc.accuracy_rate,
    mappings: acc.total_mappings,
    correct: acc.correct_mappings,
  }));

  const getColor = (value: number) => {
    if (value >= 90) return chartColors.lines.success;
    if (value >= 70) return chartColors.lines.warning;
    return 'hsl(var(--destructive))';
  };

  const COLORS = chartData.map((entry) => getColor(entry.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precisión por Tipo de Cuenta</CardTitle>
        <CardDescription>Accuracy del sistema de auto-posting por grupo PGC</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, _name: string, props: any) => {
                return [
                  <div key="tooltip" className="space-y-1">
                    <div className="font-medium">{props.payload.name}</div>
                    <div className="text-sm">Precisión: {value.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">
                      {props.payload.correct} / {props.payload.mappings} correctos
                    </div>
                  </div>,
                ];
              }}
              labelFormatter={() => ''}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => {
                const accuracy = entry.payload.value.toFixed(0);
                return `${value} (${accuracy}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors.lines.success }} />
            <span className="text-muted-foreground">≥90% Excelente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors.lines.warning }} />
            <span className="text-muted-foreground">70-90% Bueno</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">&lt;70% Revisar</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
