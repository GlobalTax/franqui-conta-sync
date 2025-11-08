import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

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
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2}
                className="quantum-chart-grid"
              />
              
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                fontWeight={400}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              />
              
              <YAxis 
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                fontWeight={400}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              
              <YAxis 
                yAxisId="right" 
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                fontWeight={400}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
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
                stroke="hsl(var(--chart-2))"
                strokeWidth={1.5}
                dot={{ r: 4, fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                name="Food Cost %"
              />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="laborPct" 
                stroke="hsl(var(--chart-3))"
                strokeWidth={1.5}
                dot={{ r: 4, fill: "hsl(var(--chart-3))", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                name="Labor %"
              />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="otherExpensesPct" 
                stroke="hsl(var(--chart-4))"
                strokeWidth={1.5}
                dot={{ r: 4, fill: "hsl(var(--chart-4))", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                name="Otros Gastos %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
