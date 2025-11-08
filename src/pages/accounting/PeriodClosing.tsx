import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Calendar, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { useClosingPeriods } from "@/hooks/useClosingPeriods";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useView } from "@/contexts/ViewContext";
import { ClosePeriodDialog } from "@/components/accounting/ClosePeriodDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function PeriodClosing() {
  const { selectedView } = useView();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const { data: closings, isLoading } = useClosingPeriods(parseInt(selectedYear));
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Cierre de Períodos" },
  ];

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Cierre de Períodos"
          breadcrumbs={breadcrumbs}
        />
        <Alert>
          <AlertDescription>
            Selecciona un centro para gestionar los cierres contables.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const monthlyClosed = closings?.filter(c => c.period_type === 'monthly' && c.status === 'closed') || [];
  const annualClosed = closings?.filter(c => c.period_type === 'annual' && c.status === 'closed') || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Cierre de Períodos Contables"
        subtitle="Gestiona los cierres mensuales y anuales con regularización automática"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => setCloseDialogOpen(true)}>
            <Lock className="mr-2 h-4 w-4" />
            Cerrar Período
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cierres Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyClosed.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              períodos cerrados en {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cierre Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {annualClosed.length > 0 ? "Cerrado" : "Pendiente"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ejercicio {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Último Cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {closings && closings.length > 0 
                ? closings[0].period_type === 'monthly' 
                  ? MONTH_NAMES[(closings[0].period_month || 1) - 1]
                  : "Anual"
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {closings && closings.length > 0 
                ? new Date(closings[0].closing_date || '').toLocaleDateString('es-ES')
                : "sin cierres"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Cierres</CardTitle>
              <CardDescription>
                Consulta los períodos cerrados y sus asientos de regularización
              </CardDescription>
            </div>
            <div className="w-32">
              <Label className="sr-only">Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : closings && closings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha Cierre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asiento</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closings.map((closing) => (
                  <TableRow key={closing.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {closing.period_type === 'monthly'
                            ? `${MONTH_NAMES[(closing.period_month || 1) - 1]} ${closing.period_year}`
                            : `Ejercicio ${closing.period_year}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={closing.period_type === 'annual' ? 'default' : 'secondary'}>
                        {closing.period_type === 'annual' ? 'Anual' : 'Mensual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {closing.closing_date 
                        ? new Date(closing.closing_date).toLocaleDateString('es-ES')
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {closing.status === 'closed' ? (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Cerrado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Abierto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {closing.regularization_entry_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            // TODO: Navigate to entry detail
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          Ver Asiento
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {closing.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No hay períodos cerrados para {selectedYear}
              </p>
              <Button onClick={() => setCloseDialogOpen(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Cerrar Primer Período
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿Qué hace el cierre contable?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 p-2 h-fit">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Genera Asiento de Regularización</h4>
              <p className="text-sm text-muted-foreground">
                Calcula automáticamente el resultado del período y genera el asiento que traspasa
                todas las cuentas del grupo 6 (gastos) y 7 (ingresos) a la cuenta 129 (Resultado del ejercicio).
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 p-2 h-fit">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Bloquea el Período</h4>
              <p className="text-sm text-muted-foreground">
                Una vez cerrado, no se pueden crear ni modificar asientos en ese período.
                Esto garantiza la integridad de los estados financieros.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 p-2 h-fit">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">Calcula el Resultado</h4>
              <p className="text-sm text-muted-foreground">
                Determina si hay beneficios o pérdidas comparando los ingresos totales
                con los gastos totales del período.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ClosePeriodDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        centroCode={selectedView.id}
      />
    </div>
  );
}
