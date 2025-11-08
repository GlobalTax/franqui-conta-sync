import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Receipt } from "lucide-react";

interface IVASummaryChartProps {
  ivaSummary: {
    repercutido: number;
    soportado: number;
    toPay: number;
  };
}

export function IVASummaryChart({ ivaSummary }: IVASummaryChartProps) {
  const chartData = [
    { 
      name: "IVA Repercutido", 
      value: ivaSummary.repercutido, 
      fill: "hsl(var(--chart-1))" 
    },
    { 
      name: "IVA Soportado", 
      value: ivaSummary.soportado, 
      fill: "hsl(var(--chart-2))" 
    },
  ];

  const total = ivaSummary.repercutido + ivaSummary.soportado;

  return (
    <Card className="border-border/40 hover:border-border transition-all duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" strokeWidth={1.5} />
          Resumen Fiscal IVA
        </CardTitle>
        <p className="text-xs text-muted-foreground">Mes actual</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-sm">{payload[0].name}</p>
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
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {chartData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.fill }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                <p className="text-sm font-medium">
                  {item.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t border-border/40 pt-4">
        <div className="w-full flex justify-between items-center">
          <span className="text-sm font-medium">IVA neto {ivaSummary.toPay > 0 ? 'a pagar' : 'a devolver'}:</span>
          <span className={`text-lg font-bold ${ivaSummary.toPay > 0 ? 'text-destructive' : 'text-success'}`}>
            {Math.abs(ivaSummary.toPay).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
