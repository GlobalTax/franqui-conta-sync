import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ExpensesCategoryChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const ExpensesCategoryChart = ({ data }: ExpensesCategoryChartProps) => {
  // Tomar solo las 5 categorías más grandes
  const topCategories = data
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-8">
        <CardTitle className="text-xl font-semibold tracking-tight">Distribución de Gastos por Categoría</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={topCategories}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}€`}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {topCategories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "none",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
