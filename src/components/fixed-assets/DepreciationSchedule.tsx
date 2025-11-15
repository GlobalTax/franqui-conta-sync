import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingDown } from "lucide-react";
import { FixedAsset } from "@/hooks/useFixedAssets";
import { useGenerateDepreciationSchedule } from "@/hooks/useDepreciationSchedule";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { DepreciationChart } from "./DepreciationChart";

interface DepreciationScheduleProps {
  asset: FixedAsset;
}

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function DepreciationSchedule({ asset }: DepreciationScheduleProps) {
  const { data: schedule, isLoading } = useGenerateDepreciationSchedule(asset.id);

  const amortizableValue = asset.acquisition_value - (asset.residual_value || 0);
  const monthlyDepreciation = schedule && schedule.length > 0 
    ? schedule[0].depreciation 
    : amortizableValue / (asset.useful_life_years * 12);

  const exportToExcel = () => {
    if (!schedule) return;

    // Crear CSV
    const headers = ["Año", "Mes", "Amortización", "Acumulado", "V. Neto Contable", "Asiento"];
    const rows = schedule.map(row => [
      row.year,
      monthNames[row.month - 1],
      row.depreciation.toFixed(2),
      row.accumulated.toFixed(2),
      row.bookValue.toFixed(2),
      row.entryId || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuadro-amortizacion-${asset.asset_code}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-600" />
            Cuadro de Amortización: {asset.asset_code}
          </CardTitle>
          <CardDescription>{asset.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Valor adquisición</p>
              <p className="text-lg font-semibold">{formatCurrency(asset.acquisition_value)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Valor residual</p>
              <p className="text-lg font-semibold">{formatCurrency(asset.residual_value || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amortización mensual</p>
              <p className="text-lg font-semibold text-orange-600">{formatCurrency(monthlyDepreciation)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Vida útil</p>
              <p className="text-lg font-semibold">{asset.useful_life_years} años</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Badge variant="outline">
              Método: {asset.depreciation_method === 'linear' ? 'Lineal' : 
                       asset.depreciation_method === 'declining' ? 'Degresivo' : 'Unidades'}
            </Badge>
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico */}
      {schedule && <DepreciationChart schedule={schedule} asset={asset} />}

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle mensual</CardTitle>
          <CardDescription>Proyección completa de amortización</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Amortización</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                  <TableHead className="text-right">V. Neto Contable</TableHead>
                  <TableHead className="text-center">Asiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule?.map((row, idx) => (
                  <TableRow key={`${row.year}-${row.month}`}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell>{monthNames[row.month - 1]}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {formatCurrency(row.depreciation)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.accumulated)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(row.bookValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.entryId ? (
                        <Badge variant="success" className="text-xs">
                          AE-{row.entryId.slice(0, 6)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
