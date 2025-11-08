import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface IncomeVsExpensesChartProps {
  data: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}

export const IncomeVsExpensesChart = ({ data }: IncomeVsExpensesChartProps) => {
  return (
    <Card>
      <CardHeader className="pb-8">
        <CardTitle className="text-xl font-semibold tracking-tight">Evolución Ingresos vs Gastos</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis 
              dataKey="month" 
              className="text-xs" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "none",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              name="Ingresos"
              stroke="hsl(var(--chart-1))"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Gastos"
              stroke="hsl(var(--chart-2))"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
