import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { TrendingUp } from "lucide-react";

interface SalesByChannelChartProps {
  data: {
    inStore: number;
    driveThru: number;
    delivery: number;
    kiosk: number;
  };
}

export function SalesByChannelChart({ data }: SalesByChannelChartProps) {
  const chartData = [
    { name: "In-Store", value: data.inStore, fill: "hsl(var(--chart-1))" },
    { name: "Drive-Thru", value: data.driveThru, fill: "hsl(var(--chart-2))" },
    { name: "Delivery", value: data.delivery, fill: "hsl(var(--chart-3))" },
    { name: "Kiosk", value: data.kiosk, fill: "hsl(var(--chart-4))" },
  ];

  const total = data.inStore + data.driveThru + data.delivery + data.kiosk;

  return (
    <Card className="border-border/40 hover:border-border transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
          Ventas por Canal
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Total: {total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <RechartsTooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-sm">{payload[0].payload.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(payload[0].value as number).toLocaleString('es-ES', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </p>
                      {total > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {((payload[0].value as number / total) * 100).toFixed(1)}% del total
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
