import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useView } from '@/contexts/ViewContext';
import { useLaborCostKPIs, useLaborCostDetails } from '@/hooks/useLaborCostKPIs';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePro } from '@/components/common/DataTablePro';

export default function LaborCosts() {
  const { selectedView } = useView();
  const centroCode = selectedView?.type === 'centre' ? selectedView.id : undefined;

  const now = new Date();
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );

  const { data: kpis, isLoading: kpisLoading } = useLaborCostKPIs(
    centroCode,
    startDate?.toISOString().split('T')[0],
    endDate?.toISOString().split('T')[0]
  );

  const { data: details = [], isLoading: detailsLoading } = useLaborCostDetails(
    centroCode,
    startDate?.toISOString().split('T')[0],
    endDate?.toISOString().split('T')[0]
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  if (!selectedView) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seleccione un centro para ver los KPIs laborales
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const columns = [
    { key: 'employeeName', label: 'Empleado' },
    { key: 'employeeNif', label: 'NIF' },
    {
      key: 'hoursWorked',
      label: 'Horas',
      render: (v: number) => v > 0 ? `${v.toFixed(1)}h` : '-',
    },
    {
      key: 'grossSalary',
      label: 'Salario Bruto',
      render: (v: number) => formatCurrency(v),
    },
    {
      key: 'socialSecurity',
      label: 'SS Empresa',
      render: (v: number) => formatCurrency(v),
    },
    {
      key: 'totalCost',
      label: 'Coste Total',
      render: (v: number) => formatCurrency(v),
    },
    {
      key: 'costPerHour',
      label: 'Coste/Hora',
      render: (v: number) => v > 0 ? formatCurrency(v) : '-',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Contabilidad', href: '/accounting' },
          { label: 'Costes Laborales' },
        ]}
        title="Costes Laborales"
        subtitle="KPIs de coste laboral por centro"
      />

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* KPI Cards */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                CPLH
              </div>
              <div className="text-2xl font-bold">{formatCurrency(kpis.cplh)}</div>
              <div className="text-xs text-muted-foreground mt-1">Coste por hora laboral</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Ventas/Hora
              </div>
              <div className="text-2xl font-bold">{formatCurrency(kpis.salesPerHour)}</div>
              <div className="text-xs text-muted-foreground mt-1">Productividad comercial</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Empleados
              </div>
              <div className="text-2xl font-bold">{kpis.employeeCount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(kpis.totalLaborCost)} coste total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                % Labor
              </div>
              <div className="text-2xl font-bold">
                {kpis.laborCostPercentage.toFixed(1)}%
                <Badge
                  variant={kpis.laborCostPercentage <= 25 ? 'default' : kpis.laborCostPercentage <= 30 ? 'secondary' : 'destructive'}
                  className="ml-2 text-xs"
                >
                  {kpis.laborCostPercentage <= 25 ? 'Excelente' : kpis.laborCostPercentage <= 30 ? 'Normal' : 'Alto'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Sobre ventas totales</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay datos de costes laborales para el período seleccionado
          </AlertDescription>
        </Alert>
      )}

      {/* Detalle por empleado */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          {detailsLoading ? (
            <Skeleton className="h-40" />
          ) : details.length > 0 ? (
            <DataTablePro columns={columns} data={details} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay datos de nóminas contabilizadas para este período
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
