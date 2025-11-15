import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DepreciationScheduleRow } from "@/hooks/useDepreciationSchedule";
import { FixedAsset } from "@/hooks/useFixedAssets";

interface DepreciationChartProps {
  schedule: DepreciationScheduleRow[];
  asset: FixedAsset;
}

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function DepreciationChart({ schedule, asset }: DepreciationChartProps) {
  // Agrupar por año para el gráfico
  const yearlyData = schedule.reduce((acc, row) => {
    const yearStr = row.year.toString();
    const existing = acc.find(d => d.year === yearStr);
    if (existing) {
      existing.depreciation += row.depreciation;
    } else {
      acc.push({
        year: yearStr,
        depreciation: row.depreciation,
        bookValue: row.bookValue,
      });
    }
    return acc;
  }, [] as Array<{ year: string; depreciation: number; bookValue: number }>);

  // Tomar datos mensuales para el gráfico (primeros 24 meses)
  const monthlyData = schedule.slice(0, 24).map(row => ({
    period: `${monthNames[row.month - 1]} ${row.year}`,
    bookValue: row.bookValue,
    accumulated: row.accumulated,
  }));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Gráfico de barras - Amortización anual */}
      <Card>
        <CardHeader>
          <CardTitle>Amortización anual</CardTitle>
          <CardDescription>Gastos de amortización por año</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="year" 
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }}
                formatter={(value: number) => `${value.toFixed(2)} €`}
              />
              <Legend />
              <Bar 
                dataKey="depreciation" 
                name="Amortización" 
                fill="hsl(var(--chart-1))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de líneas - Evolución VNC */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución del Valor Neto Contable</CardTitle>
          <CardDescription>Primeros 24 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }}
                formatter={(value: number) => `${value.toFixed(2)} €`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="bookValue" 
                name="Valor Neto Contable" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))' }}
              />
              <Line 
                type="monotone" 
                dataKey="accumulated" 
                name="Amortización Acumulada" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--chart-3))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
