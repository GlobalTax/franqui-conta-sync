import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartColors } from "@/lib/chart-theme-utils";

interface EvolutionComposedChartProps {
  data: {
    month: string;
    sales: number;
    foodCostPct: number;
    laborPct: number;
    otherExpensesPct: number;
  }[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/40 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-2" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>
            <span>
              {entry.name === "Ventas" 
                ? `${(entry.value / 1000).toFixed(1)}k €`
                : `${entry.value.toFixed(1)}%`
              }
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function EvolutionComposedChart({ data, isLoading }: EvolutionComposedChartProps) {
  const chartColors = useChartColors();
  
  return (
    <Card className="quantum-card">
      <CardHeader className="pb-8">
        <CardTitle className="text-lg font-medium">Evolución Mensual</CardTitle>
        <CardDescription>Ventas y estructura de costes por mes</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            <p>No hay datos para el periodo seleccionado</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.gradients.gold.start} stopOpacity={1} />
                  <stop offset="100%" stopColor={chartColors.gradients.gold.end} stopOpacity={1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={chartColors.grid}
                className="quantum-chart-grid"
              />
              
              <XAxis 
                dataKey="month" 
                stroke={chartColors.axis}
                fontSize={11}
                fontWeight={400}
                tickLine={false}
                axisLine={false}
              />
              
              <YAxis 
                yAxisId="left"
                stroke={chartColors.axis}
                fontSize={11}
                fontWeight={400}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              
              <YAxis 
                yAxisId="right" 
                orientation="right"
                stroke={chartColors.axis}
                fontSize={11}
                fontWeight={400}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                wrapperStyle={{ fontSize: '12px', fontWeight: 400 }}
                iconType="line"
              />
              
              {/* Barras: Ventas */}
              <Bar 
                yAxisId="left"
                dataKey="sales" 
                fill="url(#salesGradient)"
                radius={[8, 8, 0, 0]}
                name="Ventas"
              />
              
              {/* Líneas: Costes */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="foodCostPct" 
                stroke={chartColors.lines.secondary}
                strokeWidth={chartColors.strokeWidth}
                dot={{ r: chartColors.dotRadius, fill: chartColors.lines.secondary, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="Food Cost %"
              />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="laborPct" 
                stroke={chartColors.lines.success}
                strokeWidth={chartColors.strokeWidth}
                dot={{ r: chartColors.dotRadius, fill: chartColors.lines.success, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="Labor %"
              />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="otherExpensesPct" 
                stroke={chartColors.lines.warning}
                strokeWidth={chartColors.strokeWidth}
                dot={{ r: chartColors.dotRadius, fill: chartColors.lines.warning, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="Otros Gastos %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
