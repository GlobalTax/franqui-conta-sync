import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTopCorrectedSuppliers } from '@/hooks/useAutoPostingAnalytics';
import { useChartColors } from '@/lib/chart-theme-utils';
import { Badge } from '@/components/ui/badge';

export function TopCorrectedSuppliersChart() {
  const { data: suppliers, isLoading } = useTopCorrectedSuppliers(10);
  const chartColors = useChartColors();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Proveedores Corregidos</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </CardContent>
      </Card>
    );
  }

  if (!suppliers || suppliers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Proveedores Corregidos</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay correcciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = suppliers.map((supplier) => ({
    name: supplier.supplier_name?.substring(0, 20) || 'Sin nombre',
    corrections: supplier.correction_count,
    fullName: supplier.supplier_name || 'Sin nombre',
    account: supplier.most_common_account,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Proveedores Corregidos</CardTitle>
        <CardDescription>Proveedores con más correcciones manuales en el sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis type="number" stroke={chartColors.axis} fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              stroke={chartColors.axis}
              fontSize={11}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, _name: string, props: any) => {
                return [
                  <div key="tooltip" className="space-y-1">
                    <div className="font-medium">{props.payload.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      Cuenta: {props.payload.account}
                    </div>
                    <div className="text-sm">{value} correcciones</div>
                  </div>,
                ];
              }}
              labelFormatter={() => ''}
            />
            <Bar dataKey="corrections" fill={chartColors.lines.primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {suppliers.slice(0, 3).map((supplier, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {supplier.supplier_name?.substring(0, 25)} • {supplier.correction_count}x
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
