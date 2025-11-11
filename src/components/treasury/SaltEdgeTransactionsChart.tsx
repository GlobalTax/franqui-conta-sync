import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface TransactionsChartProps {
  data: Array<{ started_at: string; transactions_synced: number }>;
}

export function SaltEdgeTransactionsChart({ data }: TransactionsChartProps) {
  // Agrupar por día
  const chartData = data.reduce((acc, log) => {
    const date = format(parseISO(log.started_at), 'yyyy-MM-dd');
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.transactions += log.transactions_synced;
    } else {
      acc.push({
        date,
        displayDate: format(parseISO(log.started_at), 'dd MMM', { locale: es }),
        transactions: log.transactions_synced,
      });
    }
    
    return acc;
  }, [] as Array<{ date: string; displayDate: string; transactions: number }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transacciones Sincronizadas</CardTitle>
        <CardDescription>Últimos 30 días</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            transactions: {
              label: "Transacciones",
              color: "hsl(var(--primary))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                className="text-xs"
                tickLine={false}
              />
              <YAxis className="text-xs" tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="transactions"
                stroke="var(--color-transactions)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
